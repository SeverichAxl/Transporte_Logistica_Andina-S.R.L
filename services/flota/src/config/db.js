const { createDbPool } = require('@logistica-andina/shared');

// Pool con search_path fijado al esquema 'flota'
const pool = createDbPool('flota');

module.exports = pool;
