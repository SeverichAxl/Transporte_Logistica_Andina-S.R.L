const { verifyUserToken } = require('./jwt');
const { findById, toPublicProfile } = require('./users');

/**
 * Middleware que procesa el token JWT si está presente en la solicitud
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyUserToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}

/**
 * Middleware que exige autenticación (401 si falta o token inválido)
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Acceso no autorizado: Debe proporcionar un token de autenticación Bearer válido.',
        path: req.originalUrl
      }
    });
  }

  const token = authHeader.substring(7);
  const decoded = verifyUserToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: {
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
        status: 401,
        code: 'INVALID_TOKEN',
        message: 'El token de autenticación es inválido o ha expirado.',
        path: req.originalUrl
      }
    });
  }

  req.user = decoded;
  next();
}

/**
 * Middleware de control de acceso por roles (SEG-03)
 */
function requireRoles(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
          status: 401,
          code: 'UNAUTHORIZED',
          message: 'Se requiere inicio de sesión para acceder a este recurso.',
          path: req.originalUrl
        }
      });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        error: {
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
          status: 403,
          code: 'FORBIDDEN',
          message: `Acceso restringido para el rol ${req.user.rolNombre} (${req.user.rol}). Roles permitidos: ${allowedRoles.join(', ')}`,
          path: req.originalUrl
        }
      });
    }

    next();
  };
}

module.exports = {
  optionalAuth,
  requireAuth,
  requireRoles
};
