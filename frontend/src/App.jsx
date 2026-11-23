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

          {/* Rutas protegidas bajo el Layout corporativo con RBAC estricto */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route 
              index 
              element={
                <ProtectedRoute modulo="dashboard">
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="envios" 
              element={
                <ProtectedRoute modulo="envios">
                  <EnviosPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="flota" 
              element={
                <ProtectedRoute modulo="flota">
                  <FlotaPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="conductores" 
              element={
                <ProtectedRoute modulo="conductores">
                  <ConductoresPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="entregas" 
              element={
                <ProtectedRoute modulo="entregas">
                  <EntregasPage />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
