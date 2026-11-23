const asignacionService = require('../services/asignacion.service');
const { getPaginationParams, sendSuccess } = require('@logistica-andina/shared');

class AsignacionController {
  /** HU-CON-06: listado con filtros estado, idEnvio, idConductor, idVehiculo */
  async listar(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { estado, idEnvio, idConductor, idVehiculo } = req.query;
      const resultado = await asignacionService.listar({
        page,
        limit,
        offset,
        estado,
        idEnvio,
        idConductor,
        idVehiculo
      });
      return sendSuccess(res, resultado.items, 'Asignaciones recuperadas exitosamente', 200, resultado.pagination);
    } catch (err) {
      next(err);
    }
  }

  async obtenerPorId(req, res, next) {
    try {
      const { id } = req.params;
      const asignacion = await asignacionService.obtenerPorId(id);
      return sendSuccess(res, asignacion, 'Asignación encontrada exitosamente');
    } catch (err) {
      next(err);
    }
  }

  /** HU-CON-04 + INT-01 + INT-03: crear asignación con saga e idempotencia */
  async crear(req, res, next) {
    try {
      const idempotencyKey = req.headers['idempotency-key'] || null;
      const resultado = await asignacionService.crear(req.body, {
        idempotencyKey,
        correlationId: req.correlationId
      });

      if (resultado.replay) {
        // INT-03: repetir exactamente la respuesta original registrada
        return res.status(resultado.status).json(resultado.respuesta);
      }
      return sendSuccess(res, resultado.respuesta, 'Asignación creada exitosamente', 201);
    } catch (err) {
      next(err);
    }
  }

  /** HU-CON-05: finalizar asignación y liberar recursos */
  async finalizar(req, res, next) {
    try {
      const { id } = req.params;
      const asignacion = await asignacionService.finalizar(id, req.body || {}, {
        correlationId: req.correlationId
      });
      return sendSuccess(res, asignacion, 'Asignación finalizada exitosamente');
    } catch (err) {
      next(err);
    }
  }

  /** HU-CON-05: cancelar asignación (motivo obligatorio) */
  async cancelar(req, res, next) {
    try {
      const { id } = req.params;
      const asignacion = await asignacionService.cancelar(id, req.body || {}, {
        correlationId: req.correlationId
      });
      return sendSuccess(res, asignacion, 'Asignación cancelada exitosamente');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AsignacionController();
