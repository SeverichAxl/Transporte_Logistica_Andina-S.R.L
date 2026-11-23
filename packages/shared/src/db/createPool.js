const { Pool } = require('pg');
const logger = require('../utils/logger');

/**
 * Crea un pool de conexión a PostgreSQL configurado por esquema
 * @param {string} schema - Nombre del esquema por defecto (ej: 'envios', 'flota', etc.)
 */
function createDbPool(schema) {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    database: process.env.DB_NAME || 'logistica_andina',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('connect', (client) => {
    if (schema) {
      client.query(`SET search_path TO ${schema}, public;`);
    }
  });

  pool.on('error', (err) => {
    logger.error(`Error inesperado en el pool de PostgreSQL (${schema}): ${err.message}`, { error: err.stack });
  });

  // Método auxiliar para verificar salud de conexión
  pool.checkHealth = async () => {
    const start = Date.now();
    try {
      const res = await pool.query('SELECT NOW() as current_time, current_schema() as schema');
      return {
        status: 'UP',
        latencyMs: Date.now() - start,
        currentTime: res.rows[0].current_time,
        schema: res.rows[0].schema
      };
    } catch (err) {
      return {
        status: 'DOWN',
        latencyMs: Date.now() - start,
        error: err.message
      };
    }
  };

  return pool;
}

module.exports = createDbPool;
