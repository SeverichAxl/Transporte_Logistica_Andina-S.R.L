const entregaService = require('../services/entrega.service');
const { getPaginationParams, sendSuccess } = require('@logistica-andina/shared');

class EntregaController {
  async listar(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { idEnvio } = req.query;
      const resultado = await entregaService.listarEntregas({ page, limit, offset, idEnvio });
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
}

module.exports = new EntregaController();
