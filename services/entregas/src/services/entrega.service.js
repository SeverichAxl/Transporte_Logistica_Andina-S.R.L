const fs = require('fs');
const path = require('path');
const entregaRepository = require('../repositories/entrega.repository');
const idempotenciaRepository = require('../repositories/idempotencia.repository');
const enviosClient = require('../clients/envios.client');
const conductoresClient = require('../clients/conductores.client');
const { ApiError, buildPaginatedResponse, logger } = require('@logistica-andina/shared');
const { validarConfirmacionEntrega, validarGeneracionComprobante } = require('../utils/validacion');
const { hashBody, resolverReplay } = require('../utils/idempotencia');
const { reintentar } = require('../utils/reintentos');
const { generarPdfComprobante, guardarPdf } = require('../utils/comprobante');
const { uploadsDir } = require('../middlewares/subidaEvidencia');

const BASE_URL_GATEWAY = '/api/v1/entregas';

class EntregaService {
  /**
   * HU-ENT-05: listado paginado con filtros por fecha, conductor,
   * receptor y código de seguimiento.
   */
  async listarEntregas({ page, limit, offset, fechaDesde, fechaHasta, idConductor, receptor, codigo }, { correlationId } = {}) {
    let idEnvio;

    if (codigo) {
      // El código de seguimiento vive en MS-Envíos: se resuelve a id_envio por API
      try {
        const envio = await enviosClient.obtenerPorCodigo(codigo, correlationId);
        if (!envio) return buildPaginatedResponse([], 0, page, limit);
        idEnvio = envio.id_envio;
      } catch (err) {
        if (err.status === 404) return buildPaginatedResponse([], 0, page, limit);
        throw err;
      }
    }

    const filtros = { fechaDesde, fechaHasta, idConductor, receptor, idEnvio };
    const [items, total] = await Promise.all([
      entregaRepository.findAll({ limit, offset, ...filtros }),
      entregaRepository.countAll(filtros)
    ]);
    return buildPaginatedResponse(items, total, page, limit);
  }

  async obtenerPorId(id) {
    const entrega = await entregaRepository.findById(id);
    if (!entrega) {
      throw ApiError.notFound(`Entrega con ID ${id} no encontrada`);
    }
    const evidencias = await entregaRepository.listarEvidencias(id);
    return { ...entrega, evidencias };
  }

  /**
   * HU-ENT-01 + INT-02 + INT-03: confirmación de entrega.
   *
   * Pasos de la saga:
   *  1. Validar datos y que el envío esté EN_TRANSITO.
   *  2. Tomar el snapshot de la asignación activa (MS-Conductores).
   *  3. Registrar la entrega localmente (UNIQUE id_envio).
   *  4. Marcar el envío ENTREGADO (MS-Envíos). Si falla tras reintentos se
   *     compensa borrando la entrega y se responde 502.
   *  5. Finalizar la asignación para liberar conductor y vehículo
   *     (MS-Conductores). Si falla se registra en outbox para reproceso.
   *  6. Generar el comprobante (mejor esfuerzo: no bloquea la entrega).
   */
  async confirmar(body, { idempotencyKey, correlationId } = {}) {
    validarConfirmacionEntrega(body);
    const { codigoSeguimiento, nombreReceptor, documentoReceptor, observaciones } = body;

    // INT-03: misma clave + mismo cuerpo devuelve la respuesta original
    let hash = null;
    if (idempotencyKey) {
      hash = hashBody(body);
      const previo = await idempotenciaRepository.findByClave(idempotencyKey);
      const replay = resolverReplay(previo, hash);
      if (replay) return replay;
    }

    // 1. Envío: solo se confirman envíos EN_TRANSITO
    const envio = await enviosClient.obtenerPorCodigo(codigoSeguimiento, correlationId);
    if (!envio) {
      throw ApiError.notFound(`Envío con código ${codigoSeguimiento} no encontrado`);
    }
    if (envio.estado_codigo !== 'EN_TRANSITO') {
      throw ApiError.unprocessableEntity(
        `Solo se pueden confirmar envíos en estado EN_TRANSITO (actual: ${envio.estado_codigo})`,
        { codigoSeguimiento, estado: envio.estado_codigo },
        'ENVIO_NO_ENTREGABLE'
      );
    }

    // Una confirmación por envío (UNIQUE entrega_envio_uq)
    const previa = await entregaRepository.findByEnvio(envio.id_envio);
    if (previa) {
      throw ApiError.conflict(
        `El envío ${codigoSeguimiento} ya fue entregado (entrega #${previa.id_entrega})`,
        { idEntrega: previa.id_entrega },
        'ENTREGA_YA_REGISTRADA'
      );
    }

    // 2. Snapshot de la asignación activa (puede no existir si el envío
    //    llegó a EN_TRANSITO sin asignación registrada)
    const asignacion = await conductoresClient.findAsignacionActiva(envio.id_envio, correlationId);

    // 3. Registro local de la entrega
    const entrega = await entregaRepository.crear({
      idEnvio: envio.id_envio,
      idAsignacion: asignacion?.id_asignacion ?? null,
      idConductor: asignacion?.id_conductor ?? null,
      idVehiculo: asignacion?.id_vehiculo ?? null,
      nombreReceptor,
      documentoReceptor: documentoReceptor || null,
      fechaHoraEntrega: body.fechaHoraEntrega || new Date().toISOString(),
      observaciones: observaciones || null
    });

    const warnings = [];

    // 4. Envío -> ENTREGADO. Si falla se revierte la entrega (INT-02)
    try {
      await reintentar(() =>
        enviosClient.cambiarEstado(codigoSeguimiento, 'ENTREGADO', 'ENTREGA', correlationId)
      );
    } catch (err) {
      try {
        await entregaRepository.eliminar(entrega.id_entrega);
      } catch (compErr) {
        logger.error('Compensación de entrega fallida', {
          idEntrega: entrega.id_entrega,
          causa: compErr.message
        });
      }
      logger.warn('Entrega revertida: el envío no pudo pasar a ENTREGADO', {
        idEntrega: entrega.id_entrega,
        codigoSeguimiento,
        causa: err.message
      });
      throw err;
    }

    // 5. Liberación de recursos: conductor y vehículo vuelven a DISPONIBLE
    if (asignacion) {
      try {
        await reintentar(async () => {
          try {
            await conductoresClient.finalizarAsignacion(
              asignacion.id_asignacion,
              { observacion: `Entrega #${entrega.id_entrega}` },
              correlationId
            );
          } catch (err) {
            // Idempotente: si otra ruta ya la cerró, el resultado es el esperado
            if (err.code === 'ASIGNACION_CERRADA') return;
            throw err;
          }
        });
      } catch (err) {
        // INT-02: se marca para reproceso en vez de dejar el estado inconsistente sin registro
        try {
          await entregaRepository.guardarOutbox({
            tipoEvento: 'LIBERACION_RECURSOS_PENDIENTE',
            agregado: 'asignacion',
            idAgregado: asignacion.id_asignacion,
            payload: {
              idEntrega: entrega.id_entrega,
              idAsignacion: asignacion.id_asignacion,
              idConductor: asignacion.id_conductor,
              idVehiculo: asignacion.id_vehiculo,
              codigoSeguimiento,
              motivo: err.message
            }
          });
        } catch (outboxErr) {
          logger.error('No se pudo registrar el evento de reproceso', {
            idEntrega: entrega.id_entrega,
            causa: outboxErr.message
          });
        }
        warnings.push({
          paso: 'liberacion_recursos',
          mensaje: 'La entrega quedó confirmada, pero la liberación del conductor/vehículo requiere reproceso',
          detalle: err.message
        });
        logger.error('Liberación de recursos pendiente de reproceso', {
          idEntrega: entrega.id_entrega,
          idAsignacion: asignacion.id_asignacion,
          causa: err.message
        });
      }
    } else {
      warnings.push({
        paso: 'asignacion',
        mensaje: 'El envío no tenía una asignación activa: no hay recursos que liberar',
        detalle: null
      });
    }

    // 6. Comprobante en modo mejor esfuerzo
    let comprobante = null;
    try {
      const generado = await this._generarComprobante(
        entrega.id_entrega,
        codigoSeguimiento,
        correlationId
      );
      comprobante = generado.comprobante;
    } catch (err) {
      warnings.push({
        paso: 'comprobante',
        mensaje: 'La entrega se registró, pero el comprobante no pudo generarse automáticamente',
        detalle: err.message
      });
      logger.warn('Comprobante no generado en la confirmación', {
        idEntrega: entrega.id_entrega,
        causa: err.message
      });
    }

    const resultado = { ...(await this.obtenerPorId(entrega.id_entrega)), warnings };

    if (idempotencyKey) {
      await idempotenciaRepository.guardar({
        clave: idempotencyKey,
        endpoint: 'POST /entregas',
        hash,
        status: 201,
        respuesta: resultado
      });
    }

    logger.info('Entrega confirmada (saga completada)', {
      idEntrega: entrega.id_entrega,
      codigoSeguimiento,
      conAsignacion: Boolean(asignacion)
    });

    return { replay: false, status: 201, respuesta: resultado };
  }

  /**
   * HU-ENT-02: adjunta de 1 a 5 fotos JPG/PNG a una entrega existente.
   */
  async agregarEvidencias(idEntrega, files = []) {
    const entrega = await this.obtenerPorId(idEntrega);

    if (!files.length) {
      throw ApiError.badRequest(
        'Debe adjuntar al menos una foto de evidencia',
        { campo: 'fotos' },
        'EVIDENCIA_REQUERIDA'
      );
    }

    const existentes = await entregaRepository.contarEvidencias(idEntrega);
    if (existentes + files.length > 5) {
      await this._borrarArchivos(files);
      throw ApiError.unprocessableEntity(
        `Una entrega admite como máximo 5 fotos (ya registra ${existentes})`,
        { existentes, recibidas: files.length, maximo: 5 },
        'MAXIMO_EVIDENCIAS'
      );
    }

    const insertadas = [];
    try {
      for (const file of files) {
        const fila = await entregaRepository.insertarEvidencia(idEntrega, {
          nombreArchivo: file.originalname,
          urlArchivo: `${BASE_URL_GATEWAY}/uploads/evidencias/${file.filename}`,
          mimeType: file.mimetype,
          tamanoBytes: file.size
        });
        insertadas.push(fila);
      }
    } catch (err) {
      // Revertir lo insertado y los archivos ya escritos en disco
      await entregaRepository
        .eliminarEvidencias(idEntrega, insertadas.map((e) => e.id_evidencia))
        .catch(() => {});
      await this._borrarArchivos(files);

      if (String(err.message || '').includes('máximo 5 fotos')) {
        throw ApiError.unprocessableEntity(
          'Una entrega admite como máximo 5 fotos de evidencia',
          { maximo: 5 },
          'MAXIMO_EVIDENCIAS'
        );
      }
      throw err;
    }

    logger.info('Evidencias registradas', {
      idEntrega,
      agregadas: insertadas.length,
      total: existentes + insertadas.length
    });

    return {
      entrega: { id_entrega: entrega.id_entrega },
      agregadas: insertadas.length,
      total: existentes + insertadas.length,
      evidencias: await entregaRepository.listarEvidencias(idEntrega)
    };
  }

  /**
   * HU-ENT-03: genera (o regenera) el comprobante PDF de una entrega.
   * Se requiere codigoEnvio para validar la coherencia contra MS-Envíos,
   * ya que MS-Entregas solo persiste id_envio.
   */
  async generarComprobante(idEntrega, body, { correlationId } = {}) {
    validarGeneracionComprobante(body);
    await this.obtenerPorId(idEntrega);
    return this._generarComprobante(idEntrega, body.codigoEnvio, correlationId, {
      forzar: Boolean(body.regenerar)
    });
  }

  async _generarComprobante(idEntrega, codigoEnvio, correlationId, { forzar = false } = {}) {
    // Coherencia: el código debe corresponder al envío de la entrega
    const envio = await enviosClient.obtenerPorCodigo(codigoEnvio, correlationId);
    if (!envio) {
      throw ApiError.notFound(`Envío con código ${codigoEnvio} no encontrado`);
    }
    const entrega = await entregaRepository.findById(idEntrega);
    if (!entrega) {
      throw ApiError.notFound(`Entrega con ID ${idEntrega} no encontrada`);
    }
    if (Number(envio.id_envio) !== Number(entrega.id_envio)) {
      throw ApiError.unprocessableEntity(
        `El código ${codigoEnvio} no corresponde al envío de la entrega #${idEntrega}`,
        { codigoEnvio, idEntrega },
        'CODIGO_NO_COINCIDE'
      );
    }

    const existente = await entregaRepository.findComprobante(idEntrega);
    const evidencias = await entregaRepository.listarEvidencias(idEntrega);

    // UNIQUE(id_entrega): ya tiene comprobante y no se pidió regenerar
    if (existente && existente.url_pdf && !forzar) {
      return { comprobante: existente, regenerado: false, evidencias };
    }

    const comprobante = existente || (await entregaRepository.crearComprobante(idEntrega));

    const { buffer, hash } = await generarPdfComprobante({
      nroComprobante: comprobante.nro_comprobante,
      codigoEnvio,
      entrega,
      evidencias
    });
    const { urlPdf } = await guardarPdf(buffer, comprobante.nro_comprobante, uploadsDir);

    const actualizado = await entregaRepository.actualizarComprobante(comprobante.id_comprobante, {
      urlPdf,
      hashDocumento: hash
    });

    logger.info('Comprobante generado', {
      idEntrega,
      nroComprobante: comprobante.nro_comprobante,
      regenerado: Boolean(existente)
    });

    return { comprobante: actualizado, regenerado: Boolean(existente), evidencias };
  }

  /**
   * HU-ENT-03: devuelve los metadatos y la ruta local del PDF para descarga.
   */
  async obtenerComprobante(idEntrega) {
    const entrega = await this.obtenerPorId(idEntrega);
    const comprobante = await entregaRepository.findComprobante(idEntrega);

    if (!comprobante) {
      throw ApiError.notFound(
        `La entrega #${idEntrega} no tiene comprobante. Genérelo con POST /entregas/${idEntrega}/comprobante`,
        { idEntrega: Number(idEntrega) },
        'COMPROBANTE_NO_GENERADO'
      );
    }

    const ruta = path.join(uploadsDir, 'comprobantes', `${comprobante.nro_comprobante}.pdf`);
    if (!comprobante.url_pdf || !fs.existsSync(ruta)) {
      throw ApiError.notFound(
        `El archivo del comprobante ${comprobante.nro_comprobante} no está disponible. Genérelo de nuevo`,
        { nroComprobante: comprobante.nro_comprobante },
        'COMPROBANTE_NO_DISPONIBLE'
      );
    }

    return {
      comprobante,
      ruta,
      nombreArchivo: `${comprobante.nro_comprobante}.pdf`,
      entrega: { id_entrega: entrega.id_entrega, id_envio: entrega.id_envio }
    };
  }

  /**
   * DAS-00: resumen de entregas basado en v_entregas_por_dia.
   * Incluye la serie de los últimos 30 días con los días sin entregas en cero.
   */
  async resumen() {
    const [total, filas] = await Promise.all([
      entregaRepository.contarTotal(),
      entregaRepository.entregasPorDia()
    ]);

    const porDia = new Map(filas.map((f) => [this._claveFecha(f.dia), f.total]));
    const serie = [];
    const hoy = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
      const clave = this._claveFecha(d);
      serie.push({ dia: clave, total: porDia.get(clave) || 0 });
    }

    const suma = (desde) => serie.slice(desde).reduce((acc, f) => acc + f.total, 0);

    return {
      total,
      hoy: serie[serie.length - 1].total,
      ultimos7Dias: suma(-7),
      ultimos30Dias: suma(-30),
      porDia: serie
    };
  }

  _claveFecha(valor) {
    const d = valor instanceof Date ? valor : new Date(valor);
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  async _borrarArchivos(files = []) {
    for (const file of files) {
      if (!file?.path) continue;
      try {
        fs.unlinkSync(file.path);
      } catch {
        // mejor esfuerzo: el archivo puede no existir
      }
    }
  }
}

module.exports = new EntregaService();
