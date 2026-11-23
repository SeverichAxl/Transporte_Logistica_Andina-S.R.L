const bcrypt = require('bcryptjs');

// Hash generado para "Password123!"
const DEFAULT_PASSWORD_HASH = '$2b$10$VVNI0nK6kE22IXX5IEp3uewtvtUDFP1ncrUJShDOz9GDUpMkRvc.u';

/**
 * 5 Usuarios del sistema según los roles del Product Backlog (SEG-01):
 * - OP: Operador Logístico
 * - AF: Administrador de Flota
 * - DE: Despachador
 * - CO: Conductor
 * - GE: Gerente General
 */
const USERS = [
  {
    id: 1,
    username: 'operador',
    email: 'operador@logistica.andina',
    nombre: 'Carlos Ramos',
    rol: 'OP',
    rolNombre: 'Operador Logístico',
    passwordHash: DEFAULT_PASSWORD_HASH,
    activo: true,
    modulosPermitidos: ['dashboard', 'envios', 'conductores', 'entregas']
  },
  {
    id: 2,
    username: 'flota',
    email: 'flota@logistica.andina',
    nombre: 'Ana Mendoza',
    rol: 'AF',
    rolNombre: 'Administradora de Flota',
    passwordHash: DEFAULT_PASSWORD_HASH,
    activo: true,
    modulosPermitidos: ['dashboard', 'flota']
  },
  {
    id: 3,
    username: 'despachador',
    email: 'despacho@logistica.andina',
    nombre: 'David Castro',
    rol: 'DE',
    rolNombre: 'Despachador Operativo',
    passwordHash: DEFAULT_PASSWORD_HASH,
    activo: true,
    modulosPermitidos: ['dashboard', 'envios', 'flota', 'conductores']
  },
  {
    id: 4,
    username: 'conductor',
    email: 'conductor@logistica.andina',
    nombre: 'Mario Huamán',
    rol: 'CO',
    rolNombre: 'Conductor Titular',
    passwordHash: DEFAULT_PASSWORD_HASH,
    activo: true,
    modulosPermitidos: ['entregas']
  },
  {
    id: 5,
    username: 'gerente',
    email: 'gerencia@logistica.andina',
    nombre: 'Gabriela Paz',
    rol: 'GE',
    rolNombre: 'Gerente General',
    passwordHash: DEFAULT_PASSWORD_HASH,
    activo: true,
    modulosPermitidos: ['dashboard', 'envios', 'flota', 'conductores', 'entregas']
  }
];

function findByUsernameOrEmail(identifier) {
  if (!identifier) return null;
  const idLower = identifier.trim().toLowerCase();
  return USERS.find(u => u.username.toLowerCase() === idLower || u.email.toLowerCase() === idLower) || null;
}

function findById(id) {
  return USERS.find(u => u.id === parseInt(id, 10)) || null;
}

async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

function toPublicProfile(user) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

module.exports = {
  USERS,
  findByUsernameOrEmail,
  findById,
  verifyPassword,
  toPublicProfile
};
