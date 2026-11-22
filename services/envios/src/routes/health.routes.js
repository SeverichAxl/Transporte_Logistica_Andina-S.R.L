const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * Health check del microservicio verificando conexión a su base de datos y esquema
 */
router.get('/health', async (req, res) => {
  const dbHealth = await pool.checkHealth();
  const isHealthy = dbHealth.status === 'UP';

  res.status(isHealthy ? 200 : 503).json({
    service: 'ms-envios',
    status: isHealthy ? 'UP' : 'DOWN',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: dbHealth
  });
});

module.exports = router;
