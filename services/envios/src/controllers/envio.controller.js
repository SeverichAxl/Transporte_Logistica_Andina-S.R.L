const envioService = require('../services/envio.service');
const { getPaginationParams, sendSuccess } = require('@logistica-andina/shared');

class EnvioController {
  async listar(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { estado, codigo } = req.query;
      const resultado = await envioService.listarEnvios({ page, limit, offset, estado, codigo });
      return sendSuccess(res, resultado.items, 'Envíos recuperados exitosamente', 200, resultado.pagination);
    } catch (err) {
      next(err);
    }
  }

  async obtenerPorCodigo(req, res, next) {
    try {
      const { codigo } = req.params;
      const envio = await envioService.obtenerPorCodigo(codigo);
      return sendSuccess(res, envio, 'Envío encontrado exitosamente');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EnvioController();
