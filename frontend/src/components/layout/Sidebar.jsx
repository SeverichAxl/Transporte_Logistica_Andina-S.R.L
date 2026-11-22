import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  Users, 
  CheckCircle,
  ShieldCheck
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
        <div className="sidebar-brand-badge">
          <Truck size={20} color="#0A0908" />
        </div>
        <div className="sidebar-brand-text">
          <h2>LOGÍSTICA ANDINA</h2>
          <p>S.R.L. • Sistema Integral</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Módulos Operativos</div>
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
          <ShieldCheck size={14} color="#43C59E" />
          <span style={{ fontWeight: 600, color: '#FFFFFF' }}>Microservicios v1.0</span>
        </div>
        <div style={{ color: '#6A8EAE' }}>PostgreSQL 16 Multi-Esquema</div>
      </div>
    </aside>
  );
}
