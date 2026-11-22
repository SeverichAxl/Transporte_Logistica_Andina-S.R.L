const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  const start = Date.now();
  const correlationId = req.headers['x-correlation-id'] || req.correlationId;

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl || req.url} - ${res.statusCode} (${duration}ms)`, {
      correlationId,
      status: res.statusCode,
      method: req.method,
      url: req.originalUrl || req.url,
      durationMs: duration
    });
  });

  next();
}

module.exports = requestLogger;
