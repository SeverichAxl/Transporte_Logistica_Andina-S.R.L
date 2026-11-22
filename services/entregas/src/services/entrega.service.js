const entregaRepository = require('../repositories/entrega.repository');
const { ApiError, buildPaginatedResponse } = require('@logistica-andina/shared');

class EntregaService {
  async listarEntregas({ page, limit, offset, idEnvio }) {
    const [items, total] = await Promise.all([
      entregaRepository.findAll({ limit, offset, idEnvio }),
      entregaRepository.countAll({ idEnvio })
    ]);
    return buildPaginatedResponse(items, total, page, limit);
  }

  async obtenerPorId(id) {
    const entrega = await entregaRepository.findById(id);
    if (!entrega) {
      throw ApiError.notFound(`Entrega con ID ${id} no encontrada`);
    }
    return entrega;
  }
}

module.exports = new EntregaService();
