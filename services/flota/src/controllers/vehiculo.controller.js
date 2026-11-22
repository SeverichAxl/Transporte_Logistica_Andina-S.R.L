const vehiculoService = require('../services/vehiculo.service');
const { getPaginationParams, sendSuccess, sendCreated } = require('@logistica-andina/shared');

class VehiculoController {
  async crear(req, res, next) {
    try {
      const usuario = req.headers['x-user-name'] ? decodeURIComponent(req.headers['x-user-name']) : 'flota';
      const nuevoVehiculo = await vehiculoService.crearVehiculo(req.body, usuario);
      return sendCreated(res, nuevoVehiculo, 'Vehículo registrado exitosamente en la flota');
    } catch (err) {
      next(err);
    }
  }

  async listar(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { estado, placa, capacidadMin, soloActivos } = req.query;
      const resultado = await vehiculoService.listarVehiculos({
        page,
        limit,
        offset,
        estado,
        placa,
        capacidadMin,
        soloActivos: soloActivos !== 'false'
      });
      return sendSuccess(res, resultado.items, 'Vehículos recuperados exitosamente', 200, {
        pagination: resultado.pagination,
        metricas: resultado.metricas
      });
    } catch (err) {
      next(err);
    }
  }

  async obtenerPorId(req, res, next) {
    try {
      const { id } = req.params;
      const vehiculo = await vehiculoService.obtenerPorId(id);
      return sendSuccess(res, vehiculo, 'Vehículo encontrado exitosamente');
    } catch (err) {
      next(err);
    }
  }

  async obtenerPorPlaca(req, res, next) {
    try {
      const { placa } = req.params;
      const vehiculo = await vehiculoService.obtenerPorPlaca(placa);
      return sendSuccess(res, vehiculo, 'Vehículo encontrado exitosamente');
    } catch (err) {
      next(err);
    }
  }

  async modificar(req, res, next) {
    try {
      const { id } = req.params;
      const usuario = req.headers['x-user-name'] ? decodeURIComponent(req.headers['x-user-name']) : 'flota';
      const vehiculoActualizado = await vehiculoService.modificarVehiculo(id, req.body, usuario);
      return sendSuccess(res, vehiculoActualizado, 'Vehículo modificado exitosamente');
    } catch (err) {
      next(err);
    }
  }

  async cambiarEstado(req, res, next) {
    try {
      const { id } = req.params;
      const usuario = req.headers['x-user-name'] ? decodeURIComponent(req.headers['x-user-name']) : 'flota';
      const vehiculoActualizado = await vehiculoService.cambiarEstado(id, req.body, usuario);
      return sendSuccess(res, vehiculoActualizado, 'Estado operativo actualizado exitosamente');
    } catch (err) {
      next(err);
    }
  }

  async darDeBaja(req, res, next) {
    try {
      const { id } = req.params;
      const usuario = req.headers['x-user-name'] ? decodeURIComponent(req.headers['x-user-name']) : 'flota';
      const { motivo } = req.body;
      const vehiculoActualizado = await vehiculoService.darDeBaja(id, { motivo }, usuario);
      return sendSuccess(res, vehiculoActualizado, 'Vehículo dado de baja exitosamente');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new VehiculoController();
