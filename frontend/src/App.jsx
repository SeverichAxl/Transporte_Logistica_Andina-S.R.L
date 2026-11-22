import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/layout/Layout';
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
          <Route path="/" element={<Layout />}>
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
