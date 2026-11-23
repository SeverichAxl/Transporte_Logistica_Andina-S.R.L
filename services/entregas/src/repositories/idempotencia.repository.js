const pool = require('../config/db');

/**
 * Persistencia de claves de idempotencia (INT-03).
 * Tabla: entregas.idempotencia (clave PK, hash_request, status_http, respuesta).
 */
class IdempotenciaRepository {
  async findByClave(clave) {
    const { rows } = await pool.query(
      `SELECT clave, endpoint, hash_request, status_http, respuesta
         FROM entregas.idempotencia WHERE clave = $1`,
      [clave]
    );
    return rows[0] || null;
  }

  async guardar({ clave, endpoint, hash, status, respuesta }) {
    await pool.query(
      `INSERT INTO entregas.idempotencia (clave, endpoint, hash_request, status_http, respuesta)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (clave) DO NOTHING`,
      [clave, endpoint, hash, status, JSON.stringify(respuesta)]
    );
  }
}

module.exports = new IdempotenciaRepository();
