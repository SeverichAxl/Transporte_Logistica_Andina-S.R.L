const crypto = require('crypto');
const { ApiError } = require('@logistica-andina/shared');

/**
 * Soporte de Idempotency-Key (INT-03) para POST /entregas.
 * Misma clave + mismo cuerpo  -> devuelve la respuesta original.
 * Misma clave + cuerpo distinto -> responde 409.
 */

function serializarCanonico(valor) {
  if (valor === null || typeof valor !== 'object') return JSON.stringify(valor);
  if (Array.isArray(valor)) return `[${valor.map(serializarCanonico).join(',')}]`;
  const claves = Object.keys(valor).sort();
  return `{${claves.map((k) => `${JSON.stringify(k)}:${serializarCanonico(valor[k])}`).join(',')}}`;
}

function hashBody(body) {
  return crypto.createHash('sha256').update(serializarCanonico(body || {})).digest('hex');
}

/**
 * Devuelve la respuesta diferida si la clave ya fue procesada.
 * @returns {{replay:boolean,status:number,respuesta:any}|null}
 */
function resolverReplay(registro, hash) {
  if (!registro) return null;
  if (registro.hash_request !== hash) {
    throw ApiError.conflict(
      'La Idempotency-Key ya fue usada con un cuerpo de solicitud distinto',
      { clave: registro.clave },
      'IDEMPOTENCY_KEY_CONFLICT'
    );
  }
  return {
    replay: true,
    status: registro.status_http || 200,
    respuesta: registro.respuesta
  };
}

module.exports = { hashBody, resolverReplay, serializarCanonico };
