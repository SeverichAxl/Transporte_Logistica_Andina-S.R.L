const asignacionRepository = require('../repositories/asignacion.repository');
const conductorRepository = require('../repositories/conductor.repository');
const idempotenciaRepository = require('../repositories/idempotencia.repository');
const enviosClient = require('../clients/envios.client');
const flotaClient = require('../clients/flota.client');
const { ApiError, buildPaginatedResponse, logger } = require('@logistica-andina/shared');
const { validarCreacionAsignacion, validarCierreAsignacion } = require('../utils/validacion');
const { hashBody, resolverReplay } = require('../utils/idempotencia');
const { reintentar } = require('../utils/reintentos');

/**
 * Jerarquía de categorías de licencia para validar CATEGORIA_INSUFICIENTE.
 * A (motocicletas) < B (livianos) < C (carga pesada) < P (profesional/público).
 * Decisión: una categoría cubre todas las de rango menor o igual.
 */
const RANK_CATEGORIA = { A: 1, B: 2, C: 3, P: 4 };

/**
 * Categoría exigida cuando flota.vehiculo.categoria_licencia_requerida es NULL
 * (regla documentada en el esquema: "NULL = el servicio la deriva por capacidad").
 * Umbral: ≤ 3500 kg requiere B (livianos); > 3500 kg requiere C (carga pesada).
 */
function categoriaRequeridaPorCapacidad(capacidadKg) {
  return Number(capacidadKg) <= 3500 ? 'B' : 'C';
}

function rankCategoria(codigo) {
  return RANK_CATEGORIA[String(codigo || '').toUpperCase()] || 0;
}

class AsignacionService {
  async listar({ page, limit, offset, estado, idEnvio, idConductor, idVehiculo }) {
    const filtros = { estado, idEnvio, idConductor, idVehiculo };
    const [items, total] = await Promise.all([
      asignacionRepository.findAll({ limit, offset, ...filtros }),
      asignacionRepository.countAll(filtros)
    ]);
    return buildPaginatedResponse(items, total, page, limit);
  }

  async obtenerPorId(id) {
    const asignacion = await asignacionRepository.findById(id);
    if (!asignacion) {
      throw ApiError.notFound(`Asignación con ID ${id} no encontrada`);
    }
    return asignacion;
  }

  /**
   * HU-CON-04 + INT-01: saga de asignación orquestada por MS-Conductores.
   *
   * Pasos: validar (conductor, envío, vehículo) → crear asignación local →
   * reservar vehículo (EN_RUTA) → marcar envío (→ PENDIENTE →) EN_TRANSITO.
   * Si un paso remoto falla se compensa en orden inverso (liberar vehículo,
   * cerrar la asignación y liberar el conductor). El paso del envío va al final
   * porque su transición no es reversible en la máquina de estados.
   */
  async crear(body, { idempotencyKey, correlationId } = {}) {
    validarCreacionAsignacion(body);
    const codigoSeguimiento = body.codigoSeguimiento || body.codigoEnvio;
    const placa = body.placa || body.placaVehiculo;
    const idConductor = body.idConductor;
    const observacion = body.observacion || body.observaciones;

    // INT-03: misma clave + mismo cuerpo devuelve la respuesta original
    let hash = null;
    if (idempotencyKey) {
      hash = hashBody(body);
      const previo = await idempotenciaRepository.findByClave(idempotencyKey);
      const replay = resolverReplay(previo, hash);
      if (replay) {
        return { replay: true, status: replay.status, respuesta: replay.respuesta };
      }
    }

    // 1. Conductor (local)
    const conductor = await conductorRepository.findById(idConductor);
    if (!conductor) {
      throw ApiError.notFound(`Conductor con ID ${idConductor} no encontrado`);
    }
    if (conductor.estado_codigo !== 'DISPONIBLE') {
      throw new ApiError(
        409,
        'CONDUCTOR_OCUPADO',
        `El conductor ${conductor.nombre_completo} está en estado ${conductor.estado_codigo}`,
        { idConductor: Number(idConductor), estado: conductor.estado_codigo }
      );
    }
    const hoy = this._hoyISO();
    if (!conductor.nro_licencia || !conductor.licencia_vencimiento) {
      throw new ApiError(422, 'LICENCIA_VENCIDA', 'El conductor no tiene licencia principal registrada');
    }
    if (String(conductor.licencia_vencimiento) < hoy) {
      throw new ApiError(
        422,
        'LICENCIA_VENCIDA',
        `La licencia ${conductor.nro_licencia} venció el ${conductor.licencia_vencimiento}`,
        { nroLicencia: conductor.nro_licencia, fechaVencimiento: conductor.licencia_vencimiento }
      );
    }

    // 2. Envío (MS-Envíos)
    const envio = await enviosClient.obtenerPorCodigo(codigoSeguimiento, correlationId);
    if (!envio) {
      throw ApiError.notFound(`Envío con código ${codigoSeguimiento} no encontrado`);
    }
    const estadosAsignables = ['REGISTRADO', 'PENDIENTE'];
    if (!estadosAsignables.includes(envio.estado_codigo)) {
      throw new ApiError(
        409,
        'ENVIO_NO_ASIGNABLE',
        `El envío ${codigoSeguimiento} está en estado ${envio.estado_codigo} y no admite asignación`,
        { codigoSeguimiento, estado: envio.estado_codigo }
      );
    }

    // 3. Vehículo (MS-Flota)
    let vehiculo;
    try {
      vehiculo = await flotaClient.obtenerPorPlaca(placa, correlationId);
    } catch (err) {
      if (err.status === 404) {
        throw new ApiError(409, 'VEHICULO_NO_DISPONIBLE', `Vehículo con placa ${placa} no existe o está dado de baja`, { placa });
      }
      throw err;
    }
    if (!vehiculo || vehiculo.activo === false || vehiculo.estado_codigo !== 'DISPONIBLE') {
      throw new ApiError(
        409,
        'VEHICULO_NO_DISPONIBLE',
        `El vehículo ${placa} no está disponible (estado: ${vehiculo?.estado_codigo || 'INEXISTENTE'})`,
        { placa, estado: vehiculo?.estado_codigo || null }
      );
    }

    // 4. Capacidad de carga
    if (Number(envio.peso_kg) > Number(vehiculo.capacidad_carga_kg)) {
      throw new ApiError(
        422,
        'CAPACIDAD_EXCEDIDA',
        `El envío pesa ${envio.peso_kg} kg y el vehículo ${placa} soporta ${vehiculo.capacidad_carga_kg} kg`,
        { pesoKg: Number(envio.peso_kg), capacidadKg: Number(vehiculo.capacidad_carga_kg) }
      );
    }

    // 5. Categoría de licencia
    const requerida = (vehiculo.categoria_licencia_requerida || '').toUpperCase() ||
      categoriaRequeridaPorCapacidad(vehiculo.capacidad_carga_kg);
    if (rankCategoria(conductor.categoria_licencia) < rankCategoria(requerida)) {
      throw new ApiError(
        422,
        'CATEGORIA_INSUFICIENTE',
        `El vehículo exige categoría ${requerida} y el conductor posee ${conductor.categoria_licencia || 'NINGUNA'}`,
        { requerida, posee: conductor.categoria_licencia || null }
      );
    }

    // 6. Saga con compensación
    const asignacion = await asignacionRepository.crear({
      idConductor: Number(idConductor),
      idVehiculo: Number(vehiculo.id_vehiculo),
      idEnvio: Number(envio.id_envio),
      observacion: observacion || null
    });

    try {
      await reintentar(() =>
        flotaClient.cambiarEstado(
          vehiculo.id_vehiculo,
          'EN_RUTA',
          `Reserva por asignación #${asignacion.id_asignacion}`,
          correlationId
        )
      );
    } catch (err) {
      await this._compensarLocal(asignacion.id_asignacion, 'Compensación: reserva de vehículo fallida');
      throw err;
    }

    try {
      await this._marcarEnvioEnTransito(envio, correlationId);
    } catch (err) {
      await this._compensarVehiculo(vehiculo.id_vehiculo, correlationId);
      await this._compensarLocal(asignacion.id_asignacion, 'Compensación: fallo al marcar el envío EN_TRANSITO');
      throw err;
    }

    const resultado = await this.obtenerPorId(asignacion.id_asignacion);

    if (idempotencyKey) {
      await idempotenciaRepository.guardar({
        clave: idempotencyKey,
        endpoint: 'POST /asignaciones',
        hash,
        status: 201,
        respuesta: resultado
      });
    }

    logger.info('Asignación creada (saga completada)', {
      idAsignacion: asignacion.id_asignacion,
      idConductor: Number(idConductor),
      idVehiculo: Number(vehiculo.id_vehiculo),
      codigoSeguimiento
    });

    return { replay: false, status: 201, respuesta: resultado };
  }

  /**
   * HU-CON-05: finaliza la asignación y libera recursos.
   * Orden: primero se libera el vehículo (remoto) y luego se cierra en local,
   * para que un fallo remoto deje todo reintentable con la misma operación.
   */
  async finalizar(id, body, { correlationId } = {}) {
    return this._cerrar(id, body, 'FINALIZADA', correlationId);
  }

  /** HU-CON-05: cancela la asignación (motivo obligatorio) y libera recursos. */
  async cancelar(id, body, { correlationId } = {}) {
    validarCierreAsignacion(body, { requiereMotivo: true });
    return this._cerrar(id, body, 'CANCELADA', correlationId, body.motivo);
  }

  async _cerrar(id, body, codigoEstado, correlationId, motivo = null) {
    validarCierreAsignacion(body);

    const previa = await asignacionRepository.findById(id);
    if (!previa) {
      throw ApiError.notFound(`Asignación con ID ${id} no encontrada`);
    }
    if (previa.estado_codigo !== 'ACTIVA') {
      throw new ApiError(
        409,
        'ASIGNACION_CERRADA',
        `La asignación ${id} ya fue cerrada con estado ${previa.estado_codigo}`,
        { idAsignacion: Number(id), estado: previa.estado_codigo }
      );
    }

    // Liberar vehículo primero (idempotente): si falla, no se cierra nada.
    try {
      await reintentar(() =>
        flotaClient.cambiarEstado(
          previa.id_vehiculo,
          'DISPONIBLE',
          motivo || `Cierre de asignación #${id}`,
          correlationId
        )
      );
    } catch (err) {
      logger.error('No se pudo liberar el vehículo al cerrar la asignación', {
        idAsignacion: Number(id),
        idVehiculo: previa.id_vehiculo,
        causa: err.message
      });
      throw err;
    }

    try {
      await asignacionRepository.cerrar(id, codigoEstado, motivo || body.observacion || null);
    } catch (err) {
      // Compensación: el vehículo vuelve a EN_RUTA para no dejarlo libre con la asignación activa.
      try {
        await flotaClient.cambiarEstado(
          previa.id_vehiculo,
          'EN_RUTA',
          `Compensación: fallo al cerrar la asignación #${id}`,
          correlationId
        );
      } catch (compErr) {
        logger.error('Compensación de vehículo fallida tras fallo de cierre', {
          idAsignacion: Number(id),
          idVehiculo: previa.id_vehiculo,
          causa: compErr.message
        });
      }
      throw err;
    }

    logger.info('Asignación cerrada', { idAsignacion: Number(id), estado: codigoEstado });
    return this.obtenerPorId(id);
  }

  /**
   * Lleva el envío a EN_TRANSITO respetando la máquina de estados:
   * REGISTRADO → PENDIENTE → EN_TRANSITO (HU-ENV-04).
   */
  async _marcarEnvioEnTransito(envio, correlationId) {
    const actual = envio.estado_codigo;
    if (actual === 'EN_TRANSITO') return;

    if (actual === 'REGISTRADO') {
      await reintentar(() =>
        enviosClient.cambiarEstado(envio.codigo_seguimiento, 'PENDIENTE', 'ASIGNACION', correlationId)
      );
    }
    await reintentar(() =>
      enviosClient.cambiarEstado(envio.codigo_seguimiento, 'EN_TRANSITO', 'ASIGNACION', correlationId)
    );
  }

  async _compensarVehiculo(idVehiculo, correlationId) {
    try {
      await flotaClient.cambiarEstado(
        idVehiculo,
        'DISPONIBLE',
        'Compensación: saga de asignación fallida',
        correlationId
      );
    } catch (err) {
      logger.error('Compensación de vehículo fallida', { idVehiculo, causa: err.message });
    }
  }

  async _compensarLocal(idAsignacion, motivo) {
    try {
      await asignacionRepository.cerrar(idAsignacion, 'CANCELADA', motivo);
    } catch (err) {
      logger.error('Compensación local de asignación fallida', { idAsignacion, causa: err.message });
    }
  }

  _hoyISO() {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }
}

module.exports = new AsignacionService();
