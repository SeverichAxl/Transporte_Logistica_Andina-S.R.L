const { createDbPool } = require('@logistica-andina/shared');

// Pool con search_path fijado al esquema 'conductores'
const pool = createDbPool('conductores');

module.exports = pool;
