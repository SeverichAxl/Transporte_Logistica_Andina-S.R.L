import React from 'react';
import PageHeader from '../components/common/PageHeader';
import { Users, Plus, ShieldCheck, AlertTriangle } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';

export default function ConductoresPage() {
  return (
    <div>
      <PageHeader
        title="Gestión de Conductores y Asignaciones"
        subtitle="Módulo MVP 3: Registro de conductores, control de licencias vigentes y asignación a vehículos"
        actions={
          <button className="btn btn-primary">
            <Plus size={16} />
            <span>Nuevo Conductor</span>
          </button>
        }
      />

      <div className="card">
        <div style={{
          border: '1px dashed var(--border)',
          borderRadius: 8,
          padding: '3rem 1.5rem',
          textAlign: 'center',
          backgroundColor: '#fafafa'
        }}>
          <Users size={40} color="#94a3b8" style={{ marginBottom: '1rem' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Módulo de Conductores Preparado
          </h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto 1.5rem auto' }}>
            Endpoints de backend configurados en <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>GET/POST /api/v1/conductores</code>.
            Valida mayoría de edad, vigencia de licencia por trigger/regla de negocio y control de asignaciones.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <StatusBadge status="DISPONIBLE" />
            <StatusBadge status="EN_RUTA" />
            <StatusBadge status="INACTIVO" />
          </div>
        </div>
      </div>
    </div>
  );
}
