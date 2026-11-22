import React from 'react';
import PageHeader from '../components/common/PageHeader';
import { Package, Truck, Users, CheckCircle, TrendingUp, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const kpis = [
    { title: 'Envíos en Tránsito', value: '18', icon: Package, color: '#2563eb', desc: '+12% vs semana anterior' },
    { title: 'Flota Disponible', value: '12 / 15', icon: Truck, color: '#0f766e', desc: '80% de operatividad' },
    { title: 'Conductores Activos', value: '14', icon: Users, color: '#7c3aed', desc: '100% licencias al día' },
    { title: 'Entregas del Día', value: '45', icon: CheckCircle, color: '#16a34a', desc: 'Tasa de éxito 98.2%' }
  ];

  return (
    <div>
      <PageHeader
        title="Panel de Control General"
        subtitle="Monitoreo en tiempo real de operaciones, flota y entregas de Logística Andina"
      />

      {/* Grid de KPIs principales */}
      <div className="grid-cards">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="card-desc" style={{ marginBottom: '0.25rem' }}>{kpi.title}</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>{kpi.value}</div>
                </div>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 8,
                  backgroundColor: `${kpi.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: kpi.color
                }}>
                  <Icon size={22} />
                </div>
              </div>
              <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <TrendingUp size={14} color="#16a34a" />
                <span>{kpi.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel Informativo de Arquitectura del Esqueleto */}
      <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
        <h3 className="card-title" style={{ color: '#1e3a8a' }}>
          <AlertCircle size={20} color="#2563eb" />
          Esqueleto del Sistema Listo para Implementación
        </h3>
        <p className="card-desc" style={{ margin: '0.5rem 0 1rem 0' }}>
          La arquitectura de microservicios, el API Gateway, la base de datos PostgreSQL particionada en 4 esquemas
          (envíos, flota, conductores, entregas) y el frontend React están debidamente orquestados y preparados para 
          el desarrollo incremental de las historias de usuario de cada sprint.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="badge badge-info">API Gateway: 3000</span>
          <span className="badge badge-neutral">MS-Envíos: 3001</span>
          <span className="badge badge-neutral">MS-Flota: 3002</span>
          <span className="badge badge-neutral">MS-Conductores: 3003</span>
          <span className="badge badge-neutral">MS-Entregas: 3004</span>
          <span className="badge badge-success">PostgreSQL: 5432</span>
        </div>
      </div>
    </div>
  );
}
