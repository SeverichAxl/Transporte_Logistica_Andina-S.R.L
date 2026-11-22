import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const DEFAULT_USERS = [
  { id: 1, username: 'operador', nombre: 'Carlos Ramos', rol: 'OP', rolNombre: 'Operador Logístico' },
  { id: 2, username: 'flota', nombre: 'Ana Mendoza', rol: 'AF', rolNombre: 'Administradora de Flota' },
  { id: 3, username: 'despachador', nombre: 'David Castro', rol: 'DE', rolNombre: 'Despachador Operativo' },
  { id: 4, username: 'conductor', nombre: 'Mario Huamán', rol: 'CO', rolNombre: 'Conductor Titular' },
  { id: 5, username: 'gerente', nombre: 'Gabriela Paz', rol: 'GE', rolNombre: 'Gerente General' }
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('tla_user');
    return saved ? JSON.parse(saved) : DEFAULT_USERS[0]; // Por defecto Carlos Ramos (OP)
  });
  const [token, setToken] = useState(() => localStorage.getItem('tla_token') || '');
  const [availableUsers, setAvailableUsers] = useState(DEFAULT_USERS);

  // Cargar usuarios desde la API del gateway si está disponible
  useEffect(() => {
    axios.get('http://localhost:3000/api/v1/auth/users')
      .then(res => {
        if (res.data?.data) setAvailableUsers(res.data.data);
      })
      .catch(() => {});
  }, []);

  const loginWithUser = async (selectedUser) => {
    try {
      const res = await axios.post('http://localhost:3000/api/v1/auth/login', {
        identifier: selectedUser.username,
        password: 'Password123!'
      });
      const data = res.data.data;
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('tla_user', JSON.stringify(data.user));
      localStorage.setItem('tla_token', data.token);
      return data;
    } catch {
      // Fallback offline / local
      setUser(selectedUser);
      localStorage.setItem('tla_user', JSON.stringify(selectedUser));
    }
  };

  const logout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('tla_user');
    localStorage.removeItem('tla_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, availableUsers, loginWithUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
