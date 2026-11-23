const conductorRepository = require('../repositories/conductor.repository');
const { ApiError, buildPaginatedResponse, logger } = require('@logistica-andina/shared');
const {
  validarCreacionConductor,
  validarActualizacionConductor,
  validarRenovacionLicencia
} = require('../utils/validacion');

class ConductorService {
  async listarConductores({ page, limit, offset, estado, documento, nombre }) {
    const filtros = { estado, documento, nombre };
    const [items, total] = await Promise.all([
      conductorRepository.findAll({ limit, offset, ...filtros }),
      conductorRepository.countAll(filtros)
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

  /** HU-CON-01: registro de conductor con licencia y categoría */
  async crear(body) {
    validarCreacionConductor(body);

    const existente = await conductorRepository.findByDocumento(body.tipoDocumento, body.nroDocumento);
    if (existente) {
      throw ApiError.conflict(
        `Ya existe un conductor con ${body.tipoDocumento} ${body.nroDocumento}`,
        { idConductor: existente.id_conductor },
        'DOCUMENTO_DUPLICADO'
      );
    }

    try {
      await conductorRepository.crearConductorConLicencia({
        conductor: body,
        licencia: body.licencia
      });
    } catch (err) {
      this._traducirDuplicados(err, body);
    }

    logger.info('Conductor registrado', { tipoDocumento: body.tipoDocumento });
    const creado = await conductorRepository.findByDocumento(body.tipoDocumento, body.nroDocumento);
    return this.obtenerPorId(creado.id_conductor);
  }

  /** HU-CON-02: modificación de datos personales del conductor */
  async actualizar(id, body) {
    validarActualizacionConductor(body);

    const actual = await conductorRepository.findById(id);
    if (!actual) {
      throw ApiError.notFound(`Conductor con ID ${id} no encontrado`);
    }

    if (body.nroDocumento !== undefined || body.tipoDocumento !== undefined) {
      const tipo = body.tipoDocumento || actual.tipo_documento;
      const nro = body.nroDocumento || actual.nro_documento;
      const duplicado = await conductorRepository.findByDocumento(tipo, nro, Number(id));
      if (duplicado) {
        throw ApiError.conflict(
          `Ya existe otro conductor con ${tipo} ${nro}`,
          { idConductor: duplicado.id_conductor },
          'DOCUMENTO_DUPLICADO'
        );
      }
    }

    try {
      await conductorRepository.actualizar(id, body);
    } catch (err) {
      this._traducirDuplicados(err, body);
    }

    logger.info('Conductor actualizado', { idConductor: id });
    return this.obtenerPorId(id);
  }

  /** HU-CON-02: historial de licencias (la anterior queda en histórico) */
  async listarLicencias(id) {
    const conductor = await conductorRepository.findById(id);
    if (!conductor) {
      throw ApiError.notFound(`Conductor con ID ${id} no encontrado`);
    }
    return conductorRepository.listarLicencias(id);
  }

  /** HU-CON-02: renovación de licencia con una sola principal */
  async renovarLicencia(id, body) {
    validarRenovacionLicencia(body);

    const conductor = await conductorRepository.findById(id);
    if (!conductor) {
      throw ApiError.notFound(`Conductor con ID ${id} no encontrado`);
    }

    try {
      await conductorRepository.renovarLicencia(id, body);
    } catch (err) {
      this._traducirDuplicados(err, body);
    }

    logger.info('Licencia renovada', { idConductor: id, nroLicencia: body.nroLicencia });
    return {
      licencias: await conductorRepository.listarLicencias(id),
      mensaje: 'La licencia anterior dejó de ser principal y se conserva en el histórico'
    };
  }

  /** HU-CON-03: alertas de licencias vencidas o por vencer (≤ 30 días) */
  async alertasLicencias(dias = 30) {
    const limite = Number(dias);
    if (Number.isNaN(limite) || limite < 1 || limite > 365) {
      throw ApiError.badRequest('El parámetro dias debe estar entre 1 y 365');
    }
    const alertas = await conductorRepository.alertasLicencias(limite);
    return {
      diasLimite: limite,
      total: alertas.length,
      vencidas: alertas.filter((a) => a.alerta === 'VENCIDA').length,
      porVencer: alertas.filter((a) => a.alerta !== 'VENCIDA').length,
      alertas
    };
  }

  /** Resumen por estado para el dashboard (alimenta /dashboard/kpis) */
  async resumen() {
    const porEstado = await conductorRepository.resumenPorEstado();
    const porEstadoMap = Object.fromEntries(porEstado.map((r) => [r.estado, r.total]));
    return {
      total: porEstado.reduce((acc, r) => acc + r.total, 0),
      porEstado: {
        DISPONIBLE: porEstadoMap.DISPONIBLE || 0,
        OCUPADO: porEstadoMap.OCUPADO || 0,
        INACTIVO: porEstadoMap.INACTIVO || 0
      }
    };
  }

  _traducirDuplicados(err, body) {
    if (err && err.code === '23505') {
      if (String(err.constraint || '').includes('licencia_nro')) {
        throw ApiError.conflict(
          `Ya existe una licencia con el número ${body.licencia?.nroLicencia || body.nroLicencia}`,
          null,
          'LICENCIA_DUPLICADA'
        );
      }
      if (String(err.constraint || '').includes('documento')) {
        throw ApiError.conflict(
          `Ya existe un conductor con ${body.tipoDocumento || ''} ${body.nroDocumento || ''}`.trim(),
          null,
          'DOCUMENTO_DUPLICADO'
        );
      }
      throw ApiError.conflict('Registro duplicado', err.detail, 'DUPLICATE_KEY');
    }
    throw err;
  }
}

module.exports = new ConductorService();
