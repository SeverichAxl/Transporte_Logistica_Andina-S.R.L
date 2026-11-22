const conductorRepository = require('../repositories/conductor.repository');
const { ApiError, buildPaginatedResponse } = require('@logistica-andina/shared');

class ConductorService {
  async listarConductores({ page, limit, offset, estado, documento }) {
    const [items, total] = await Promise.all([
      conductorRepository.findAll({ limit, offset, estado, documento }),
      conductorRepository.countAll({ estado, documento })
    ]);
    return buildPaginatedResponse(items, total, page, limit);
  }

  async obtenerPorId(id) {
    const conductor = await conductorRepository.findById(id);
    if (!conductor) {
      throw ApiError.notFound(`Conductor con ID ${id} no encontrado`);
    }
    return conductor;
  }
}

module.exports = new ConductorService();
