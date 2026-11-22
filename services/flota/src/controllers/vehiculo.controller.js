const vehiculoService = require('../services/vehiculo.service');
const { getPaginationParams, sendSuccess } = require('@logistica-andina/shared');

class VehiculoController {
  async listar(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { estado, placa } = req.query;
      const resultado = await vehiculoService.listarVehiculos({ page, limit, offset, estado, placa });
      return sendSuccess(res, resultado.items, 'Vehículos recuperados exitosamente', 200, resultado.pagination);
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
}

module.exports = new VehiculoController();
