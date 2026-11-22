const { createDbPool } = require('@logistica-andina/shared');

// Pool con search_path fijado al esquema 'envios'
const pool = createDbPool('envios');

module.exports = pool;
