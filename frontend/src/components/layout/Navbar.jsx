import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck, RefreshCw, UserCheck, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const [gatewayStatus, setGatewayStatus] = useState('checking');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, availableUsers, loginWithUser } = useAuth();

  const checkStatus = async () => {
    try {
      const res = await axios.get('http://localhost:3000/health', { timeout: 2000 });
      setGatewayStatus(res.data.status === 'UP' ? 'online' : 'degraded');
    } catch {
      setGatewayStatus('offline');
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="app-navbar">
      <div className="navbar-status">
        <span 
          className="status-indicator" 
          style={{ 
            backgroundColor: gatewayStatus === 'online' ? '#16a34a' : (gatewayStatus === 'degraded' ? '#ca8a04' : '#dc2626') 
          }}
        />
        <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>
          Gateway: {gatewayStatus === 'online' ? 'Operativo (3000)' : (gatewayStatus === 'degraded' ? 'Degradado' : 'Sin conexión')}
        </span>
        <button 
          onClick={checkStatus} 
          title="Verificar conexión"
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: '#64748b' }}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', position: 'relative' }}>
        {/* Selector de Usuario Activo (5 Roles) */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: '#f8fafc',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0.4rem 0.75rem',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: '#1e3a8a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '0.75rem'
            }}>
              {user?.rol || 'US'}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.2 }}>{user?.nombre || 'Usuario'}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rol: {user?.rolNombre || user?.rol}</div>
            </div>
            <ChevronDown size={14} color="#64748b" />
          </button>

          {showUserMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.5rem',
              width: 260,
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border)',
              zIndex: 100,
              padding: '0.5rem 0'
            }}>
              <div style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', borderBottom: '1px solid #f1f5f9' }}>
                CAMBIAR ROL / USUARIO (HU SEED)
              </div>
              {availableUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    loginWithUser(u);
                    setShowUserMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    background: user?.id === u.id ? '#eff6ff' : 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.825rem'
                  }}
                >
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    backgroundColor: '#e2e8f0',
                    color: '#1e293b'
                  }}>
                    {u.rol}
                  </span>
                  <div>
                    <div style={{ fontWeight: 500 }}>{u.nombre}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{u.rolNombre}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: '#475569' }}>
          <ShieldCheck size={16} color="#0f766e" />
          <span>PostgreSQL 16 Docker</span>
        </div>
      </div>
    </header>
  );
}
