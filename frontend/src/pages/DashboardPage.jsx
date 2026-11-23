import React from 'react';
import PageHeader from '../components/common/PageHeader';
import { Package, Truck, Users, CheckCircle, TrendingUp, ShieldCheck } from 'lucide-react';

export default function DashboardPage() {
  const kpis = [
    { title: 'Envíos en Tránsito', value: '18', icon: Package, color: '#6A8EAE', bg: '#f0f4f8', desc: '+12% vs semana anterior' },
    { title: 'Flota Disponible', value: '12 / 15', icon: Truck, color: '#43C59E', bg: '#e8f9f3', desc: '80% de operatividad' },
    { title: 'Conductores Activos', value: '14', icon: Users, color: '#0A0908', bg: '#e2e8f0', desc: '100% licencias al día' },
    { title: 'Entregas del Día', value: '45', icon: CheckCircle, color: '#43C59E', bg: '#e8f9f3', desc: 'Tasa de éxito 98.2%' }
  ];

  return (
    <div>
      <PageHeader
        title="Panel de Control General"
        subtitle="Monitoreo operativo en tiempo real de Logística Andina S.R.L."
      />

      {/* Grid de KPIs principales */}
      <div className="grid-cards">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-slate-dark)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                    {kpi.title}
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--c-dark)' }}>
                    {kpi.value}
                  </div>
                </div>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: kpi.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: kpi.color
                }}>
                  <Icon size={22} color={kpi.color} />
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <TrendingUp size={14} color="var(--c-mint-dark)" />
                <span>{kpi.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tarjeta de Arquitectura y Estado de Módulos */}
      <div className="card" style={{ borderTop: '4px solid var(--c-mint)', backgroundColor: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--c-mint-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={18} color="var(--c-mint-dark)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--c-dark)' }}>
              Plataforma Integral de Gestión Logística
            </h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--c-text-secondary)' }}>
              Esquemas de Base de Datos y Microservicios Desacoplados
            </div>
          </div>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--c-text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          El sistema opera sobre una arquitectura de microservicios homogénea. El API Gateway (puerto 3000) centraliza la autenticación con JWT (5 roles: OP, AF, DE, CO, GE) y enruta las operaciones hacia los microservicios de <strong>Envíos</strong> (3001) y <strong>Flota</strong> (3002).
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="badge badge-dark">API Gateway : 3000</span>
          <span className="badge badge-mint">MS-Envíos : 3001 (Activo)</span>
          <span className="badge badge-mint">MS-Flota : 3002 (Activo)</span>
          <span className="badge badge-slate">MS-Conductores : 3003</span>
          <span className="badge badge-slate">MS-Entregas : 3004</span>
          <span className="badge badge-mint">PostgreSQL 16 : 5432</span>
        </div>
      </div>
    </div>
  );
}
