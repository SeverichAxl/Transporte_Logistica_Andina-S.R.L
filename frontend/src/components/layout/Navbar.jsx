import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck, RefreshCw } from 'lucide-react';
import axios from 'axios';

export default function Navbar() {
  const [gatewayStatus, setGatewayStatus] = useState('checking');

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

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: '#475569' }}>
          <ShieldCheck size={16} color="#0f766e" />
          <span>Ambiente Local • PostgreSQL Docker</span>
        </div>
      </div>
    </header>
  );
}
