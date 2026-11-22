const express = require('express');
const router = express.Router();
const config = require('../config');

/**
 * Health check consolidado del API Gateway y sus microservicios dependientes
 */
router.get('/health', async (req, res) => {
  const start = Date.now();
  const serviceChecks = await Promise.allSettled(
    Object.entries(config.services).map(async ([key, service]) => {
      const sStart = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch(`${service.url}/health`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const data = await response.json();
        return {
          service: service.name,
          status: response.ok ? 'UP' : 'DEGRADED',
          statusCode: response.status,
          latencyMs: Date.now() - sStart,
          details: data
        };
      } catch (err) {
        return {
          service: service.name,
          status: 'DOWN',
          latencyMs: Date.now() - sStart,
          error: err.name === 'AbortError' ? 'TIMEOUT (2000ms)' : err.message
        };
      }
    })
  );

  const servicesStatus = {};
  let anyDown = false;

  serviceChecks.forEach((result, idx) => {
    const key = Object.keys(config.services)[idx];
    if (result.status === 'fulfilled') {
      servicesStatus[key] = result.value;
      if (result.value.status === 'DOWN') anyDown = true;
    } else {
      servicesStatus[key] = { status: 'DOWN', error: result.reason?.message };
      anyDown = true;
    }
  });

  const statusCode = anyDown ? 207 : 200; // 207 Multi-Status o 200 OK

  res.status(statusCode).json({
    status: anyDown ? 'DEGRADED' : 'UP',
    gateway: {
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - start
    },
    services: servicesStatus
  });
});

module.exports = router;
