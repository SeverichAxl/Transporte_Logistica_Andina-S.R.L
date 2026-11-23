const { createHttpClient, ApiError } = require('@logistica-andina/shared');

const BASE_URL = process.env.ENVIOS_SERVICE_URL || 'http://localhost:3001';

/**
 * Cliente HTTP de MS-Envíos (INT-01).
 * Traduce caídas del servicio a 502/503 y propaga el correlation-id.
 */
function crearCliente(correlationId) {
  return createHttpClient(BASE_URL, {
    timeout: 5000,
    getCorrelationId: () => correlationId
  });
}

async function _get(ruta, correlationId) {
  const cliente = crearCliente(correlationId);
  const { data } = await cliente.get(ruta);
  return data?.data ?? null;
}

/**
 * GET /api/v1/envios/:codigo
 */
async function obtenerPorCodigo(codigo, correlationId) {
  return _get(`/api/v1/envios/${encodeURIComponent(codigo)}`, correlationId);
}

/**
 * PATCH /api/v1/envios/:codigo/estado  (contrato HU-ENV-04, aún no implementado en MS-Envíos)
 * body: { estado, origenEvento, usuario, observacion }
 */
async function cambiarEstado(codigo, estado, origenEvento, correlationId, usuario = 'sistema') {
  const cliente = crearCliente(correlationId);
  try {
    const { data } = await cliente.patch(
      `/api/v1/envios/${encodeURIComponent(codigo)}/estado`,
      { estado, origenEvento, usuario }
    );
    return data?.data ?? null;
  } catch (err) {
    throw traducirErrorPaso(err, 'MS-Envíos', `cambiar estado del envío ${codigo} a ${estado}`);
  }
}

/**
 * Convierte un fallo de servicio dependiente en 502/503 comprensible.
 * Los errores de negocio (404 NOT_FOUND, 409, 422) se propagan tal cual.
 */
function traducirErrorPaso(err, servicio, paso) {
  if (err instanceof ApiError) {
    const esFalloDeInfraestructura =
      err.status >= 500 || err.code === 'DEPENDENT_SERVICE_ERROR' || err.code === 'SERVICE_UNAVAILABLE';
    if (esFalloDeInfraestructura) {
      return ApiError.badGateway(
        `Fallo el paso "${paso}": ${servicio} no respondió correctamente`,
        { servicio, paso, causa: err.message, status: err.status },
        'SAGA_PASO_FALLIDO'
      );
    }
    return err;
  }
  return ApiError.badGateway(
    `Fallo el paso "${paso}": ${servicio} no está disponible`,
    { servicio, paso, causa: err.message },
    'SAGA_PASO_FALLIDO'
  );
}

module.exports = { obtenerPorCodigo, cambiarEstado, traducirErrorPaso };
