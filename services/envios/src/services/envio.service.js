const envioRepository = require('../repositories/envio.repository');
const { ApiError, buildPaginatedResponse } = require('@logistica-andina/shared');

class EnvioService {
  async crearEnvio(datosEnvio, usuario = 'operador') {
    const {
      remitente,
      destinatario,
      origenCiudad,
      origenDireccion,
      destinoCiudad,
      destinoDireccion,
      descripcionCarga,
      pesoKg
    } = datosEnvio;

    // Validaciones de negocio (HU-ENV-01)
    if (!remitente || !remitente.nroDocumento || !remitente.nombreCompleto) {
      throw ApiError.badRequest('Datos del remitente incompletos (nroDocumento y nombreCompleto requeridos)');
    }
    if (!destinatario || !destinatario.nroDocumento || !destinatario.nombreCompleto) {
      throw ApiError.badRequest('Datos del destinatario incompletos (nroDocumento y nombreCompleto requeridos)');
    }
    if (!origenCiudad || !origenDireccion) {
      throw ApiError.badRequest('Ciudad y dirección de origen son obligatorias');
    }
    if (!destinoCiudad || !destinoDireccion) {
      throw ApiError.badRequest('Ciudad y dirección de destino son obligatorias');
    }
    const peso = parseFloat(pesoKg);
    if (isNaN(peso) || peso <= 0) {
      throw ApiError.badRequest('El peso de la carga debe ser un número mayor a 0 kg', { pesoKg });
    }

    const payload = {
      remitente: {
        tipoDocumento: remitente.tipoDocumento || 'DNI',
        nroDocumento: remitente.nroDocumento.trim(),
        nombreCompleto: remitente.nombreCompleto.trim(),
        telefono: remitente.telefono || null,
        email: remitente.email || null,
        direccion: remitente.direccion || origenDireccion
      },
      destinatario: {
        tipoDocumento: destinatario.tipoDocumento || 'DNI',
        nroDocumento: destinatario.nroDocumento.trim(),
        nombreCompleto: destinatario.nombreCompleto.trim(),
        telefono: destinatario.telefono || null,
        email: destinatario.email || null,
        direccion: destinatario.direccion || destinoDireccion
      },
      origenCiudad: origenCiudad.trim(),
      origenDireccion: origenDireccion.trim(),
      destinoCiudad: destinoCiudad.trim(),
      destinoDireccion: destinoDireccion.trim(),
      descripcionCarga: descripcionCarga ? descripcionCarga.trim() : 'Mercancía general',
      pesoKg: peso,
      usuario
    };

    return envioRepository.createEnvio(payload);
  }

  async listarEnvios({ page, limit, offset, estado, codigo, ciudad, fechaDesde, fechaHasta }) {
    const [items, total] = await Promise.all([
      envioRepository.findAll({ limit, offset, estado, codigo, ciudad, fechaDesde, fechaHasta }),
      envioRepository.countAll({ estado, codigo, ciudad, fechaDesde, fechaHasta })
    ]);
    return buildPaginatedResponse(items, total, page, limit);
  }

  async obtenerPorId(id) {
    const envio = await envioRepository.findById(id);
    if (!envio) {
      throw ApiError.notFound(`Envío con ID ${id} no encontrado`);
    }
    const historial = await envioRepository.getHistorial(id);
    return { ...envio, historial };
  }

  async obtenerPorCodigo(codigo) {
    const envio = await envioRepository.findByCodigo(codigo);
    if (!envio) {
      throw ApiError.notFound(`Envío con código ${codigo} no encontrado`);
    }
    const historial = await envioRepository.getHistorial(envio.id_envio);
    return { ...envio, historial };
  }

  async modificarEnvio(id, datos, usuario = 'operador') {
    const envio = await envioRepository.findById(id);
    if (!envio) {
      throw ApiError.notFound(`Envío con ID ${id} no encontrado`);
    }

    // Validación HU-ENV-02: No modificar si está EN_TRANSITO (3), ENTREGADO (4) o CANCELADO (5)
    // Responde 409 CONFLICT
    if ([3, 4, 5].includes(envio.id_estado) || ['EN_TRANSITO', 'ENTREGADO', 'CANCELADO'].includes(envio.estado_codigo)) {
      throw ApiError.conflict(
        `No se puede modificar el envío en estado '${envio.estado_nombre || envio.estado_codigo}'. Solo es editable en REGISTRADO o PENDIENTE.`,
        { estadoActual: envio.estado_codigo, idEnvio: id }
      );
    }

    if (datos.pesoKg !== undefined) {
      const peso = parseFloat(datos.pesoKg);
      if (isNaN(peso) || peso <= 0) {
        throw ApiError.badRequest('El peso debe ser mayor a 0 kg');
      }
      datos.pesoKg = peso;
    }

    await envioRepository.updateEnvio(id, datos);
    return this.obtenerPorId(id);
  }

  async cambiarEstado(id, datos = {}, usuario = 'operador') {
    const { nuevoEstado, estado, observacion, idOrigen: idOrigenParam, origenEvento } = datos;
    const targetStateRaw = nuevoEstado || estado;

    // Acepta id numérico o código de seguimiento TLA-...
    const envio = isNaN(Number(id)) 
      ? await envioRepository.findByCodigo(id)
      : await envioRepository.findById(Number(id));

    if (!envio) {
      throw ApiError.notFound(`Envío ${id} no encontrado`);
    }

    if (!targetStateRaw) {
      throw ApiError.badRequest('Debe indicar el nuevoEstado (código o ID)');
    }

    // Resolver idOrigen según origenEvento
    let idOrigen = idOrigenParam || 1;
    if (origenEvento) {
      const origenes = { MANUAL: 1, ASIGNACION: 2, ENTREGA: 3, SISTEMA: 4 };
      idOrigen = origenes[String(origenEvento).toUpperCase()] || 1;
    }

    // Resolver ID del nuevo estado
    let targetEstado;
    if (typeof targetStateRaw === 'number' || !isNaN(parseInt(targetStateRaw, 10))) {
      const idNum = parseInt(targetStateRaw, 10);
      const codigos = { 1: 'REGISTRADO', 2: 'PENDIENTE', 3: 'EN_TRANSITO', 4: 'ENTREGADO', 5: 'CANCELADO' };
      targetEstado = { id_estado: idNum, codigo: codigos[idNum] };
    } else {
      targetEstado = await envioRepository.getEstadoByCodigo(targetStateRaw);
    }

    if (!targetEstado) {
      throw ApiError.badRequest(`Estado '${nuevoEstado}' no reconocido en el sistema`);
    }

    // Validar transición válida (HU-ENV-04) -> 422 si es inválida
    const esValida = await envioRepository.isTransicionValida(envio.id_estado, targetEstado.id_estado);
    if (!esValida) {
      throw ApiError.unprocessableEntity(
        `Transición no permitida de '${envio.estado_codigo}' a '${targetEstado.codigo}'.`,
        { estadoActual: envio.estado_codigo, estadoSolicitado: targetEstado.codigo }
      );
    }

    // HU-ENV-05: Motivo obligatorio si se cancela (id 5)
    if (targetEstado.id_estado === 5 && (!observacion || !observacion.trim())) {
      throw ApiError.badRequest('Para cancelar un envío es obligatorio indicar el motivo en la observación.');
    }

    await envioRepository.updateEstado(envio.id_envio, {
      idEstadoAnterior: envio.id_estado,
      idEstadoNuevo: targetEstado.id_estado,
      usuario,
      observacion: observacion || `Cambio de estado a ${targetEstado.codigo}`,
      idOrigen
    });

    return this.obtenerPorId(envio.id_envio);
  }
}

module.exports = new EnvioService();
