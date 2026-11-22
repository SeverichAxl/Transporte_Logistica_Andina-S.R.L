import React from 'react';

export default function Footer() {
  return (
    <footer style={{
      padding: '1rem 2rem',
      borderTop: '1px solid var(--c-slate-border)',
      backgroundColor: '#FFFFFF',
      fontSize: '0.8rem',
      color: 'var(--c-text-muted)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <span>© 2026 Transporte y Logística Andina S.R.L.</span>
      <span style={{ color: 'var(--c-slate)' }}>Arquitectura de Microservicios</span>
    </footer>
  );
}
