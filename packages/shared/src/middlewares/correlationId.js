const { randomUUID } = require('crypto');

/**
 * Middleware para generar o propagar X-Correlation-Id
 */
function correlationIdMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || randomUUID();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  next();
}

module.exports = correlationIdMiddleware;
