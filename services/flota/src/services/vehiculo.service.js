const vehiculoRepository = require('../repositories/vehiculo.repository');
const { ApiError, buildPaginatedResponse } = require('@logistica-andina/shared');

class VehiculoService {
  async listarVehiculos({ page, limit, offset, estado, placa }) {
    const [items, total] = await Promise.all([
      vehiculoRepository.findAll({ limit, offset, estado, placa }),
      vehiculoRepository.countAll({ estado, placa })
    ]);
    return buildPaginatedResponse(items, total, page, limit);
  }

  async obtenerPorPlaca(placa) {
    const vehiculo = await vehiculoRepository.findByPlaca(placa);
    if (!vehiculo) {
      throw ApiError.notFound(`Vehículo con placa ${placa} no encontrado o inactivo`);
    }
    return vehiculo;
  }
}

module.exports = new VehiculoService();
