const { createDbPool } = require('@logistica-andina/shared');

// Pool con search_path fijado al esquema 'entregas'
const pool = createDbPool('entregas');

module.exports = pool;
