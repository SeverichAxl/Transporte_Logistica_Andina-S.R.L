import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  Users, 
  CheckCircle,
  Network
} from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/envios', label: 'Gestión de Envíos', icon: Package },
    { to: '/flota', label: 'Gestión de Flota', icon: Truck },
    { to: '/conductores', label: 'Conductores', icon: Users },
    { to: '/entregas', label: 'Control de Entregas', icon: CheckCircle }
  ];

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand-icon">
          🚚
        </div>
        <div className="sidebar-brand-text">
          <h2>LOGÍSTICA ANDINA</h2>
          <p>S.R.L. • Plataforma Integral</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Módulos del Sistema</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Network size={14} color="#38bdf8" />
          <span style={{ fontWeight: 600, color: '#f8fafc' }}>Microservicios v1.0</span>
        </div>
        <div>Kata Arquitectónico 2026</div>
      </div>
    </aside>
  );
}
