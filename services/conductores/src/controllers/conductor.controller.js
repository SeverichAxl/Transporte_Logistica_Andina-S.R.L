const conductorService = require('../services/conductor.service');
const { getPaginationParams, sendSuccess } = require('@logistica-andina/shared');

class ConductorController {
  async listar(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { estado, documento, nombre } = req.query;
      const resultado = await conductorService.listarConductores({ page, limit, offset, estado, documento, nombre });
      return sendSuccess(res, resultado.items, 'Conductores recuperados exitosamente', 200, resultado.pagination);
    } catch (err) {
      next(err);
    }
  }

  async obtenerPorId(req, res, next) {
    try {
      const { id } = req.params;
      const conductor = await conductorService.obtenerPorId(id);
      return sendSuccess(res, conductor, 'Conductor encontrado exitosamente');
    } catch (err) {
      next(err);
    }
  }

  /** HU-CON-01: registro de conductor con licencia */
  async crear(req, res, next) {
    try {
      const conductor = await conductorService.crear(req.body);
      return sendSuccess(res, conductor, 'Conductor registrado exitosamente', 201);
    } catch (err) {
      next(err);
    }
  }

  /** HU-CON-02: modificación de datos del conductor */
  async actualizar(req, res, next) {
    try {
      const { id } = req.params;
      const conductor = await conductorService.actualizar(id, req.body);
      return sendSuccess(res, conductor, 'Conductor actualizado exitosamente');
    } catch (err) {
      next(err);
    }
  }

  /** HU-CON-02: historial de licencias */
  async listarLicencias(req, res, next) {
    try {
      const { id } = req.params;
      const licencias = await conductorService.listarLicencias(id);
      return sendSuccess(res, licencias, 'Licencias recuperadas exitosamente');
    } catch (err) {
      next(err);
    }
  }

  /** HU-CON-02: renovación de licencia (la anterior queda en histórico) */
  async renovarLicencia(req, res, next) {
    try {
      const { id } = req.params;
      const resultado = await conductorService.renovarLicencia(id, req.body);
      return sendSuccess(res, resultado, 'Licencia renovada exitosamente', 201);
    } catch (err) {
      next(err);
    }
  }

  /** HU-CON-03: alertas de licencias vencidas o por vencer */
  async alertasLicencias(req, res, next) {
    try {
      const { dias } = req.query;
      const resultado = await conductorService.alertasLicencias(dias);
      return sendSuccess(res, resultado, 'Alertas de licencias recuperadas exitosamente');
    } catch (err) {
      next(err);
    }
  }

  /** Resumen por estado para el dashboard */
  async resumen(req, res, next) {
    try {
      const resultado = await conductorService.resumen();
      return sendSuccess(res, resultado, 'Resumen de conductores recuperado exitosamente');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ConductorController();
