import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <AlertTriangle size={48} color="#ca8a04" style={{ marginBottom: '1rem' }} />
      <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>404 - Página no encontrada</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        El módulo o recurso solicitado no existe dentro del sistema.
      </p>
      <Link to="/" className="btn btn-primary">
        <Home size={16} />
        <span>Volver al Dashboard</span>
      </Link>
    </div>
  );
}
