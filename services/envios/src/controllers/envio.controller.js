const envioService = require('../services/envio.service');
const { getPaginationParams, sendSuccess, sendCreated } = require('@logistica-andina/shared');

class EnvioController {
  async crear(req, res, next) {
    try {
      const usuario = req.headers['x-user-name'] ? decodeURIComponent(req.headers['x-user-name']) : 'operador';
      const nuevoEnvio = await envioService.crearEnvio(req.body, usuario);
      return sendCreated(res, nuevoEnvio, 'Envío registrado exitosamente');
    } catch (err) {
      next(err);
    }
  }

  async listar(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { estado, codigo, ciudad, fechaDesde, fechaHasta } = req.query;
      const resultado = await envioService.listarEnvios({
        page, limit, offset, estado, codigo, ciudad, fechaDesde, fechaHasta
      });
      return sendSuccess(res, resultado.items, 'Envíos recuperados exitosamente', 200, resultado.pagination);
    } catch (err) {
      next(err);
    }
  }

  async obtenerPorId(req, res, next) {
    try {
      const { id } = req.params;
      const envio = await envioService.obtenerPorId(id);
      return sendSuccess(res, envio, 'Envío encontrado exitosamente');
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

  async modificar(req, res, next) {
    try {
      const { id } = req.params;
      const usuario = req.headers['x-user-name'] ? decodeURIComponent(req.headers['x-user-name']) : 'operador';
      const envioActualizado = await envioService.modificarEnvio(id, req.body, usuario);
      return sendSuccess(res, envioActualizado, 'Envío modificado exitosamente');
    } catch (err) {
      next(err);
    }
  }

  async cambiarEstado(req, res, next) {
    try {
      const { id } = req.params;
      const usuario = req.headers['x-user-name'] ? decodeURIComponent(req.headers['x-user-name']) : 'operador';
      const envioActualizado = await envioService.cambiarEstado(id, req.body, usuario);
      return sendSuccess(res, envioActualizado, 'Estado del envío actualizado exitosamente');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EnvioController();
