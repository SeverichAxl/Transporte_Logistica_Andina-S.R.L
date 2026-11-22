/**
 * Clase estándar para errores de la API
 */
class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Solicitud incorrecta', details = null, code = 'BAD_REQUEST') {
    return new ApiError(400, code, message, details);
  }

  static unauthorized(message = 'No autorizado', details = null, code = 'UNAUTHORIZED') {
    return new ApiError(401, code, message, details);
  }

  static forbidden(message = 'Acceso prohibido', details = null, code = 'FORBIDDEN') {
    return new ApiError(403, code, message, details);
  }

  static notFound(message = 'Recurso no encontrado', details = null, code = 'NOT_FOUND') {
    return new ApiError(404, code, message, details);
  }

  static conflict(message = 'Conflicto con el estado actual del recurso', details = null, code = 'CONFLICT') {
    return new ApiError(409, code, message, details);
  }

  static unprocessableEntity(message = 'Entidad no procesable (validación fallida)', details = null, code = 'UNPROCESSABLE_ENTITY') {
    return new ApiError(422, code, message, details);
  }

  static internal(message = 'Error interno del servidor', details = null, code = 'INTERNAL_SERVER_ERROR') {
    return new ApiError(500, code, message, details);
  }

  static badGateway(message = 'Fallo de comunicación con servicio dependiente', details = null, code = 'BAD_GATEWAY') {
    return new ApiError(502, code, message, details);
  }

  static serviceUnavailable(message = 'Servicio no disponible temporalmente', details = null, code = 'SERVICE_UNAVAILABLE') {
    return new ApiError(503, code, message, details);
  }
}

module.exports = ApiError;
