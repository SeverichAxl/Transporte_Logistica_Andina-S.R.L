import React from 'react';
import PageHeader from '../components/common/PageHeader';
import { Truck, Plus, CheckCircle2, Wrench, Ban } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';

export default function FlotaPage() {
  return (
    <div>
      <PageHeader
        title="Gestión de Flota de Vehículos"
        subtitle="Módulo MVP 2: Control de disponibilidad, mantenimiento y capacidad de carga"
        actions={
          <button className="btn btn-primary">
            <Plus size={16} />
            <span>Registrar Vehículo</span>
          </button>
        }
      />

      <div className="grid-cards">
        <div className="card">
          <div className="card-title" style={{ color: '#16a34a' }}>
            <CheckCircle2 size={18} />
            <span>Disponibles</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>12 unidades</div>
          <p className="card-desc">Listos para asignación inmediata</p>
        </div>

        <div className="card">
          <div className="card-title" style={{ color: '#0284c7' }}>
            <Truck size={18} />
            <span>En Ruta</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>3 unidades</div>
          <p className="card-desc">Operando envíos nacionales</p>
        </div>

        <div className="card">
          <div className="card-title" style={{ color: '#ca8a04' }}>
            <Wrench size={18} />
            <span>Mantenimiento</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>1 unidad</div>
          <p className="card-desc">Revisión técnica periódica</p>
        </div>
      </div>

      <div className="card">
        <div style={{
          border: '1px dashed var(--border)',
          borderRadius: 8,
          padding: '3rem 1.5rem',
          textAlign: 'center',
          backgroundColor: '#fafafa'
        }}>
          <Truck size={40} color="#94a3b8" style={{ marginBottom: '1rem' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Módulo de Flota Preparado
          </h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 1.5rem auto' }}>
            Endpoints de backend configurados en <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>GET/POST /api/v1/flota</code>.
            Listo para conectar con el esquema <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>flota</code>.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <StatusBadge status="DISPONIBLE" />
            <StatusBadge status="EN_RUTA" />
            <StatusBadge status="MANTENIMIENTO" />
          </div>
        </div>
      </div>
    </div>
  );
}
