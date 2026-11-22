const conductorService = require('../services/conductor.service');
const { getPaginationParams, sendSuccess } = require('@logistica-andina/shared');

class ConductorController {
  async listar(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { estado, documento } = req.query;
      const resultado = await conductorService.listarConductores({ page, limit, offset, estado, documento });
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
}

module.exports = new ConductorController();
