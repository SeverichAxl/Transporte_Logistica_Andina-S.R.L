const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_logistica_andina_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

/**
 * Genera un token JWT con la información del usuario
 */
function signUserToken(user) {
  const payload = {
    sub: user.id,
    id: user.id,
    username: user.username,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
    rolNombre: user.rolNombre,
    modulosPermitidos: user.modulosPermitidos
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'logistica-andina-gateway'
  });
}

/**
 * Verifica un token JWT
 */
function verifyUserToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'logistica-andina-gateway'
    });
  } catch {
    return null;
  }
}

module.exports = {
  signUserToken,
  verifyUserToken,
  JWT_SECRET,
  JWT_EXPIRES_IN
};
