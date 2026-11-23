import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck, RefreshCw, ChevronDown, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const [gatewayStatus, setGatewayStatus] = useState('checking');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, availableUsers, loginWithUser, logout } = useAuth();
  const navigate = useNavigate();

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="app-navbar">
      {/* Estado del API Gateway */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
        <span 
          style={{ 
            display: 'inline-block',
            width: 9,
            height: 9,
            borderRadius: '50%',
            backgroundColor: gatewayStatus === 'online' ? '#43C59E' : (gatewayStatus === 'degraded' ? '#DD6B20' : '#E53E3E'),
            boxShadow: gatewayStatus === 'online' ? '0 0 0 3px rgba(67, 197, 158, 0.2)' : 'none'
          }}
        />
        <span style={{ fontWeight: 600, color: '#0A0908' }}>
          Gateway: {gatewayStatus === 'online' ? 'Activo (3000)' : (gatewayStatus === 'degraded' ? 'Degradado' : 'Sin conexión')}
        </span>
        <button 
          onClick={checkStatus} 
          title="Verificar conexión del API Gateway"
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            display: 'flex', 
            color: '#6A8EAE',
            padding: 4,
            borderRadius: 4
          }}
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Selector de Usuario Activo (5 Roles) y Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              backgroundColor: '#FFFFFF',
              border: '1px solid #d2dee9',
              borderRadius: '8px',
              padding: '0.45rem 0.85rem',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-subtle)'
            }}
          >
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '6px',
              backgroundColor: '#0A0908',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.04em'
            }}>
              {user?.rol || 'US'}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, color: '#0A0908', fontSize: '0.85rem', lineHeight: 1.2 }}>
                {user?.nombre || 'Usuario'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#6A8EAE', fontWeight: 500 }}>
                {user?.rolNombre || user?.rol}
              </div>
            </div>
            <ChevronDown size={14} color="#6A8EAE" />
          </button>

          {showUserMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.5rem',
              width: 270,
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-overlay)',
              border: '1px solid #d2dee9',
              zIndex: 100,
              padding: '0.5rem 0'
            }}>
              <div style={{ 
                padding: '0.4rem 0.85rem', 
                fontSize: '0.7rem', 
                fontWeight: 700, 
                color: '#6A8EAE', 
                letterSpacing: '0.06em', 
                textTransform: 'uppercase',
                borderBottom: '1px solid #f0f4f8' 
              }}>
                Cambiar Rol Activo (5 Roles)
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
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    backgroundColor: user?.id === u.id ? '#e8f9f3' : 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.825rem',
                    transition: 'background-color 0.1s ease'
                  }}
                >
                  <span style={{
                    padding: '2px 7px',
                    borderRadius: 4,
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    backgroundColor: user?.id === u.id ? '#43C59E' : '#0A0908',
                    color: user?.id === u.id ? '#0A0908' : '#FFFFFF'
                  }}>
                    {u.rol}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0A0908' }}>{u.nombre}</div>
                    <div style={{ fontSize: '0.72rem', color: '#6A8EAE' }}>{u.rolNombre}</div>
                  </div>
                </button>
              ))}

              <div style={{ borderTop: '1px solid #f0f4f8', marginTop: '0.35rem', paddingTop: '0.35rem' }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.825rem',
                    color: 'var(--c-danger)',
                    fontWeight: 600
                  }}
                >
                  <LogOut size={15} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: '#6A8EAE' }}>
          <ShieldCheck size={16} color="#43C59E" />
          <span style={{ fontWeight: 500 }}>PostgreSQL 16</span>
        </div>
      </div>
    </header>
  );
}
