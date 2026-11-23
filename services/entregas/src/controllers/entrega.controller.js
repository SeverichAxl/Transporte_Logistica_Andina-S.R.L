const entregaService = require('../services/entrega.service');
const { getPaginationParams, sendSuccess, ApiError } = require('@logistica-andina/shared');

class EntregaController {
  /** HU-ENT-05: listado con filtros por fecha, conductor, receptor y código */
  async listar(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { fechaDesde, fechaHasta, idConductor, receptor, codigo, idEnvio } = req.query;
      const resultado = await entregaService.listarEntregas(
        { page, limit, offset, fechaDesde, fechaHasta, idConductor, receptor, codigo, idEnvio },
        { correlationId: req.correlationId }
      );
      return sendSuccess(res, resultado.items, 'Entregas recuperadas exitosamente', 200, resultado.pagination);
    } catch (err) {
      next(err);
    }
  }

  async obtenerPorId(req, res, next) {
    try {
      const { id } = req.params;
      const entrega = await entregaService.obtenerPorId(id);
      return sendSuccess(res, entrega, 'Entrega encontrada exitosamente');
    } catch (err) {
      next(err);
    }
  }

  /** HU-ENT-01 + INT-02 + INT-03: confirmación de entrega con idempotencia */
  async confirmar(req, res, next) {
    try {
      const idempotencyKey = req.headers['idempotency-key'] || null;
      const resultado = await entregaService.confirmar(req.body, {
        idempotencyKey,
        correlationId: req.correlationId
      });

      if (resultado.replay) {
        // INT-03: repetir exactamente la respuesta original registrada
        return res.status(resultado.status).json(resultado.respuesta);
      }
      return sendSuccess(res, resultado.respuesta, 'Entrega confirmada exitosamente', 201);
    } catch (err) {
      next(err);
    }
  }

  /** DAS-00: resumen para el dashboard */
  async resumen(req, res, next) {
    try {
      const resultado = await entregaService.resumen();
      return sendSuccess(res, resultado, 'Resumen de entregas recuperado exitosamente');
    } catch (err) {
      next(err);
    }
  }

  /** HU-ENT-02: subida de 1 a 5 fotos de evidencia (multer) */
  async subirEvidencias(req, res, next) {
    try {
      const { id } = req.params;
      const resultado = await entregaService.agregarEvidencias(id, req.files || []);
      return sendSuccess(res, resultado, 'Evidencias registradas exitosamente', 201);
    } catch (err) {
      next(err);
    }
  }

  /** HU-ENT-02: listado de evidencias de una entrega */
  async listarEvidencias(req, res, next) {
    try {
      const { id } = req.params;
      const entrega = await entregaService.obtenerPorId(id);
      return sendSuccess(res, entrega.evidencias, 'Evidencias recuperadas exitosamente');
    } catch (err) {
      next(err);
    }
  }

  /** HU-ENT-03: generación del comprobante PDF */
  async generarComprobante(req, res, next) {
    try {
      const { id } = req.params;
      const resultado = await entregaService.generarComprobante(id, req.body || {}, {
        correlationId: req.correlationId
      });
      const status = resultado.regenerado ? 200 : 201;
      return sendSuccess(
        res,
        resultado,
        resultado.regenerado ? 'Comprobante existente devuelto (use regenerar=true para emitirlo de nuevo)' : 'Comprobante generado exitosamente',
        status
      );
    } catch (err) {
      next(err);
    }
  }

  /** HU-ENT-03 / FE-ENT-02: descarga del PDF */
  async descargarComprobante(req, res, next) {
    try {
      const { id } = req.params;
      const { ruta, nombreArchivo, comprobante } = await entregaService.obtenerComprobante(id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${nombreArchivo}"`
      );
      res.setHeader('X-Comprobante-Hash', comprobante.hash_documento || '');
      return res.sendFile(ruta);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EntregaController();
