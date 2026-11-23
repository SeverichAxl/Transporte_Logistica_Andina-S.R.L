const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const config = require('../config');

/**
 * Configura los proxies inversos hacia cada microservicio,
 * inyectando Correlation ID y datos del usuario autenticado (SEG-03).
 */
function setupProxies(app) {
  Object.values(config.services).forEach((service) => {
    app.use(
      service.pathPrefix,
      createProxyMiddleware({
        target: service.url,
        changeOrigin: true,
        on: {
          proxyReq: (proxyReq, req, res) => {
            // Re-escribir el body en caso de que algún middleware lo haya pre-parseado
            fixRequestBody(proxyReq, req);

            // Propagar o inyectar X-Correlation-Id
            const correlationId = req.headers['x-correlation-id'] || req.correlationId;
            if (correlationId) {
              proxyReq.setHeader('X-Correlation-Id', correlationId);
            }

            // Propagar datos del usuario autenticado si existe (SEG-03)
            if (req.user) {
              proxyReq.setHeader('X-User-Id', req.user.id);
              proxyReq.setHeader('X-User-Role', req.user.rol);
              proxyReq.setHeader('X-User-Name', encodeURIComponent(req.user.nombre));
              proxyReq.setHeader('X-User-Email', req.user.email);
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
