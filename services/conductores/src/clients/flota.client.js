const { createHttpClient } = require('@logistica-andina/shared');
const { traducirErrorPaso } = require('./envios.client');

const BASE_URL = process.env.FLOTA_SERVICE_URL || 'http://localhost:3002';

/**
 * Cliente HTTP de MS-Flota (INT-01).
 * Contrato esperado de HU-FLO-04 (pendiente en el módulo Flota):
 *   GET   /api/v1/flota/:placa
 *   PATCH /api/v1/flota/vehiculos/:id/estado   body: { estado, motivo, usuario }
 * El cambio de estado se identifica por id porque MS-Conductores solo
 * persiste id_vehiculo en la asignación (sin la placa).
 */
function crearCliente(correlationId) {
  return createHttpClient(BASE_URL, {
    timeout: 5000,
    getCorrelationId: () => correlationId
  });
}

/**
 * GET /api/v1/flota/:placa
 */
async function obtenerPorPlaca(placa, correlationId) {
  const cliente = crearCliente(correlationId);
  try {
    const { data } = await cliente.get(`/api/v1/flota/${encodeURIComponent(placa)}`);
    return data?.data ?? null;
  } catch (err) {
    throw traducirErrorPaso(err, 'MS-Flota', `obtener el vehículo ${placa}`);
  }
}

/**
 * PATCH /api/v1/flota/vehiculos/:id/estado  (contrato HU-FLO-04)
 * body: { estado, motivo, usuario }
 */
async function cambiarEstado(idVehiculo, estado, motivo, correlationId, usuario = 'sistema') {
  const cliente = crearCliente(correlationId);
  try {
    const { data } = await cliente.patch(
      `/api/v1/flota/vehiculos/${idVehiculo}/estado`,
      { estado, motivo, usuario }
    );
    return data?.data ?? null;
  } catch (err) {
    throw traducirErrorPaso(err, 'MS-Flota', `cambiar estado del vehículo ${idVehiculo} a ${estado}`);
  }
}

module.exports = { obtenerPorPlaca, cambiarEstado };
