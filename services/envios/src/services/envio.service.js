const envioRepository = require('../repositories/envio.repository');
const { ApiError, buildPaginatedResponse } = require('@logistica-andina/shared');

class EnvioService {
  async listarEnvios({ page, limit, offset, estado, codigo }) {
    const [items, total] = await Promise.all([
      envioRepository.findAll({ limit, offset, estado, codigo }),
      envioRepository.countAll({ estado, codigo })
    ]);
    return buildPaginatedResponse(items, total, page, limit);
  }

  async obtenerPorCodigo(codigo) {
    const envio = await envioRepository.findByCodigo(codigo);
    if (!envio) {
      throw ApiError.notFound(`Envío con código ${codigo} no encontrado`);
    }
    return envio;
  }
}

module.exports = new EnvioService();
