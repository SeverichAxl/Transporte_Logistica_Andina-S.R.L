import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

export default function ProtectedRoute({ children, modulo }) {
  const { isAuthenticated, hasPermission, user, logout } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificación estricta de permiso por módulo (SEG-03)
  if (modulo && !hasPermission(modulo)) {
    // Si intenta entrar al Dashboard raíz ("/") pero su rol no lo tiene permitido (ej. Conductor),
    // redirigir suavemente a su módulo primario
    if (modulo === 'dashboard') {
      const allowed = user?.modulosPermitidos || [];
      if (allowed.includes('entregas')) {
        return <Navigate to="/entregas" replace />;
      }
      if (allowed.length > 0) {
        return <Navigate to={`/${allowed[0]}`} replace />;
      }
    }

    return (
      <div style={{
        padding: '3rem 2rem',
        maxWidth: 580,
        margin: '3rem auto',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        boxShadow: 'var(--shadow-subtle)',
        textAlign: 'center'
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: '#FFF5F5',
          color: '#E53E3E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem auto'
        }}>
          <ShieldAlert size={32} />
        </div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0A0908', marginBottom: '0.5rem' }}>
          Módulo No Autorizado para tu Rol (SEG-03)
        </h2>
        <p style={{ color: '#4A5568', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          Has iniciado sesión como <strong>{user?.nombre}</strong> con el rol <strong>{user?.rolNombre} ({user?.rol})</strong>.
          Tu cuenta no tiene privilegios para acceder al módulo <code>{modulo}</code>.
        </p>

        <div style={{
          display: 'inline-block',
          padding: '0.6rem 1rem',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          fontSize: '0.8rem',
          color: '#6A8EAE',
          marginBottom: '1.75rem'
        }}>
          Tus módulos autorizados: <strong>{(user?.modulosPermitidos || []).join(', ') || 'Ninguno'}</strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => window.history.back()}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <ArrowLeft size={16} /> Regresar
          </button>
          <button
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--c-danger)' }}
          >
            <LogOut size={16} /> Iniciar con otro rol
          </button>
        </div>
      </div>
    );
  }

  return children;
}
