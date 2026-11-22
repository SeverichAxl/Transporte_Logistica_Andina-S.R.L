const ApiError = require('./ApiError');

/**
 * Middleware centralizado de manejo de errores
 * Retorna siempre el formato estándar:
 * {
 *   success: false,
 *   error: {
 *     timestamp: "2026-...",
 *     status: 400,
 *     code: "BAD_REQUEST",
 *     message: "...",
 *     path: "/api/v1/...",
 *     details: ...
 *   }
 * }
 */
function errorHandler(err, req, res, next) {
  let status = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'Ha ocurrido un error inesperado en el servidor';
  let details = null;

  if (err instanceof ApiError) {
    status = err.status;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === 'ValidationError') {
    status = 422;
    code = 'VALIDATION_ERROR';
    message = err.message;
    details = err.errors || null;
  } else if (err.code === '23505') { // Postgres Unique Violation
    status = 409;
    code = 'DUPLICATE_KEY';
    message = 'Registro duplicado: ya existe un elemento con los mismos datos clave';
    details = err.detail || null;
  } else if (err.code === '23503') { // Postgres Foreign Key Violation
    status = 400;
    code = 'FOREIGN_KEY_VIOLATION';
    message = 'Violación de clave foránea: el registro referenciado no existe';
    details = err.detail || null;
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    status = 503;
    code = 'SERVICE_UNAVAILABLE';
    message = 'No se pudo establecer conexión con un servicio dependiente o la base de datos';
  } else if (err.message) {
    message = err.message;
  }

  const correlationId = req.headers['x-correlation-id'] || req.correlationId;

  const errorResponse = {
    success: false,
    error: {
      timestamp: new Date().toISOString(),
      correlationId: correlationId || undefined,
      status,
      code,
      message,
      path: req.originalUrl || req.url,
      details: details || undefined
    }
  };

  if (process.env.NODE_ENV !== 'production' && status === 500) {
    errorResponse.error.stack = err.stack;
  }

  res.status(status).json(errorResponse);
}

module.exports = errorHandler;
