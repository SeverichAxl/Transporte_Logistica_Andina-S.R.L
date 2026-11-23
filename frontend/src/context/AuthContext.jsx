import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const DEFAULT_USERS = [
  { 
    id: 1, 
    username: 'operador', 
    email: 'operador@logistica.andina', 
    nombre: 'Carlos Ramos', 
    rol: 'OP', 
    rolNombre: 'Operador Logístico',
    modulosPermitidos: ['dashboard', 'envios', 'conductores', 'entregas']
  },
  { 
    id: 2, 
    username: 'flota', 
    email: 'flota@logistica.andina', 
    nombre: 'Ana Mendoza', 
    rol: 'AF', 
    rolNombre: 'Administradora de Flota',
    modulosPermitidos: ['dashboard', 'flota']
  },
  { 
    id: 3, 
    username: 'despachador', 
    email: 'despacho@logistica.andina', 
    nombre: 'David Castro', 
    rol: 'DE', 
    rolNombre: 'Despachador Operativo',
    modulosPermitidos: ['dashboard', 'envios', 'flota', 'conductores']
  },
  { 
    id: 4, 
    username: 'conductor', 
    email: 'conductor@logistica.andina', 
    nombre: 'Mario Huamán', 
    rol: 'CO', 
    rolNombre: 'Conductor Titular',
    modulosPermitidos: ['entregas']
  },
  { 
    id: 5, 
    username: 'gerente', 
    email: 'gerencia@logistica.andina', 
    nombre: 'Gabriela Paz', 
    rol: 'GE', 
    rolNombre: 'Gerente General',
    modulosPermitidos: ['dashboard', 'envios', 'flota', 'conductores', 'entregas']
  }
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('tla_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('tla_token') || '');
  const [availableUsers, setAvailableUsers] = useState(DEFAULT_USERS);
  const [loading, setLoading] = useState(false);

  // Cargar usuarios desde la API del gateway si está disponible
  useEffect(() => {
    axios.get('http://localhost:3000/api/v1/auth/users', { timeout: 2000 })
      .then(res => {
        if (res.data?.data && Array.isArray(res.data.data)) {
          setAvailableUsers(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  /**
   * Verifica si el usuario actual tiene permiso para ver un módulo (SEG-03)
   */
  const hasPermission = (modulo) => {
    if (!user) return false;
    if (user.rol === 'GE') return true;
    if (Array.isArray(user.modulosPermitidos)) {
      return user.modulosPermitidos.includes(modulo);
    }
    // Mapeo por defecto según rol
    const permisos = {
      OP: ['dashboard', 'envios', 'conductores', 'entregas'],
      AF: ['dashboard', 'flota'],
      DE: ['dashboard', 'envios', 'flota', 'conductores'],
      CO: ['entregas'],
      GE: ['dashboard', 'envios', 'flota', 'conductores', 'entregas']
    };
    return (permisos[user.rol] || []).includes(modulo);
  };

  /**
   * Inicio de sesión formal con credenciales
   */
  const login = async (identifier, password) => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:3000/api/v1/auth/login', {
        identifier: identifier.trim(),
        password
      }, { timeout: 4000 });

      const data = res.data.data;
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('tla_user', JSON.stringify(data.user));
      localStorage.setItem('tla_token', data.token);
      return data;
    } catch (err) {
      // Fallback local en caso de que el Gateway esté apagado
      const idLower = identifier.trim().toLowerCase();
      const found = availableUsers.find(u => u.username.toLowerCase() === idLower || u.email.toLowerCase() === idLower);
      if (found && password === 'Password123!') {
        const fakeToken = `dev-jwt-${Date.now()}`;
        setUser(found);
        setToken(fakeToken);
        localStorage.setItem('tla_user', JSON.stringify(found));
        localStorage.setItem('tla_token', fakeToken);
        return { user: found, token: fakeToken };
      }

      const msg = err.response?.data?.error?.message || err.message || 'Error al iniciar sesión';
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Inicio de sesión rápido para pruebas (1 clic)
   */
  const loginWithUser = async (selectedUser) => {
    return login(selectedUser.username, 'Password123!');
  };

  /**
   * Cierre de sesión (limpia almacenamiento y estado)
   */
  const logout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('tla_user');
    localStorage.removeItem('tla_token');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user && !!token,
      availableUsers,
      loading,
      hasPermission,
      login,
      loginWithUser,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
