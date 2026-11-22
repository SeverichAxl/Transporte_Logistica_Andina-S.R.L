const express = require('express');
const router = express.Router();
const { 
  USERS, 
  findByUsernameOrEmail, 
  verifyPassword, 
  toPublicProfile 
} = require('../auth/users');
const { signUserToken } = require('../auth/jwt');
const { requireAuth } = require('../auth/auth.middleware');

/**
 * POST /api/v1/auth/login y POST /auth/login
 * Criterio SEG-02: Inicio de sesión con JWT y hash bcrypt
 */
router.post('/login', async (req, res) => {
  const { identifier, username, email, password } = req.body;
  const userIdentifier = identifier || username || email;

  if (!userIdentifier || !password) {
    return res.status(400).json({
      success: false,
      error: {
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
        status: 400,
        code: 'MISSING_CREDENTIALS',
        message: 'Debe ingresar usuario/correo y contraseña.',
        path: req.originalUrl
      }
    });
  }

  const user = findByUsernameOrEmail(userIdentifier);
  if (!user || !user.activo) {
    return res.status(401).json({
      success: false,
      error: {
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Credenciales inválidas. Verifique su usuario o contraseña.',
        path: req.originalUrl
      }
    });
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      error: {
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Credenciales inválidas. Verifique su usuario o contraseña.',
        path: req.originalUrl
      }
    });
  }

  const token = signUserToken(user);
  const userProfile = toPublicProfile(user);

  return res.status(200).json({
    success: true,
    message: `Bienvenido al sistema, ${user.nombre}`,
    data: {
      token,
      user: userProfile
    }
  });
});

/**
 * GET /api/v1/auth/me
 * Retorna el usuario actual a partir del token
 */
router.get('/me', requireAuth, (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: req.user
    }
  });
});

/**
 * GET /api/v1/auth/users
 * Retorna los 5 usuarios del sistema para demostración / selector
 */
router.get('/users', (req, res) => {
  const publicUsers = USERS.map(toPublicProfile);
  return res.status(200).json({
    success: true,
    data: publicUsers
  });
});

module.exports = router;
