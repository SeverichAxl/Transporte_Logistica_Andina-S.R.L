import React from 'react';

export default function Footer() {
  return (
    <footer style={{
      padding: '1rem 2rem',
      borderTop: '1px solid var(--border)',
      backgroundColor: '#ffffff',
      fontSize: '0.8rem',
      color: 'var(--text-muted)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <span>© 2026 Transporte y Logística Andina S.R.L. — Todos los derechos reservados.</span>
      <span>Arquitectura basada en Microservicios</span>
    </footer>
  );
}
