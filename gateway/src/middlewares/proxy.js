const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('../config');

/**
 * Configura los proxies inversos hacia cada microservicio
 */
function setupProxies(app) {
  Object.values(config.services).forEach((service) => {
    app.use(
      service.pathPrefix,
      createProxyMiddleware({
        target: service.url,
        changeOrigin: true,
        on: {
          proxyReq: (proxyReq, req) => {
            // Propagar o inyectar X-Correlation-Id
            const correlationId = req.headers['x-correlation-id'] || req.correlationId;
            if (correlationId) {
              proxyReq.setHeader('X-Correlation-Id', correlationId);
            }
          },
          error: (err, req, res) => {
            const correlationId = req.headers['x-correlation-id'] || req.correlationId;
            res.status(502).json({
              success: false,
              error: {
                timestamp: new Date().toISOString(),
                correlationId,
                status: 502,
                code: 'BAD_GATEWAY',
                message: `No se pudo conectar con el servicio ${service.name} (${service.url})`,
                path: req.originalUrl,
                details: err.message
              }
            });
          }
        }
      })
    );
  });
}

module.exports = setupProxies;
