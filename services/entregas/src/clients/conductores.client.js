const { createHttpClient } = require('@logistica-andina/shared');
const { traducirErrorPaso } = require('./envios.client');

const BASE_URL = process.env.CONDUCTORES_SERVICE_URL || 'http://localhost:3003';

/**
 * Cliente HTTP de MS-Conductores (INT-02).
 * Contratos consumidos:
 *   GET   /api/v1/conductores/asignaciones?estado=ACTIVA&idEnvio=<id>
 *   PATCH /api/v1/conductores/asignaciones/:id/finalizar   body: { observacion, usuario }
 */
function crearCliente(correlationId) {
  return createHttpClient(BASE_URL, {
    timeout: 5000,
    getCorrelationId: () => correlationId
  });
}

/**
 * Asignación ACTIVA vigente de un envío (snapshot HU-ENT-01).
 * @returns {Promise<object|null>}
 */
async function findAsignacionActiva(idEnvio, correlationId) {
  const cliente = crearCliente(correlationId);
  try {
    const { data } = await cliente.get('/api/v1/conductores/asignaciones', {
      params: { estado: 'ACTIVA', idEnvio }
    });
    const items = data?.data || [];
    return items[0] || null;
  } catch (err) {
    throw traducirErrorPaso(err, 'MS-Conductores', `obtener la asignación activa del envío ${idEnvio}`);
  }
}

/**
 * PATCH /api/v1/conductores/asignaciones/:id/finalizar (libera conductor y vehículo).
 * Es idempotente: si la asignación ya está cerrada responde 409 ASIGNACION_CERRADA,
 * que el llamador puede tratar como éxito.
 */
async function finalizarAsignacion(idAsignacion, { observacion, usuario = 'sistema-entrega' } = {}, correlationId) {
  const cliente = crearCliente(correlationId);
  try {
    const { data } = await cliente.patch(
      `/api/v1/conductores/asignaciones/${idAsignacion}/finalizar`,
      { observacion, usuario }
    );
    return data?.data ?? null;
  } catch (err) {
    throw traducirErrorPaso(err, 'MS-Conductores', `finalizar la asignación ${idAsignacion}`);
  }
}

module.exports = { findAsignacionActiva, finalizarAsignacion };
