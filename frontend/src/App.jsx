import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EnviosPage from './pages/EnviosPage';
import FlotaPage from './pages/FlotaPage';
import ConductoresPage from './pages/ConductoresPage';
import EntregasPage from './pages/EntregasPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta pública de Login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas protegidas bajo el Layout corporativo */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="envios" element={<EnviosPage />} />
            <Route path="flota" element={<FlotaPage />} />
            <Route path="conductores" element={<ConductoresPage />} />
            <Route path="entregas" element={<EntregasPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
