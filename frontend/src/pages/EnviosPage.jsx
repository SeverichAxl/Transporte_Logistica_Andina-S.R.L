import React from 'react';
import PageHeader from '../components/common/PageHeader';
import { Package, Plus, Search, Filter } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';

export default function EnviosPage() {
  return (
    <div>
      <PageHeader
        title="Gestión de Envíos"
        subtitle="Módulo MVP 1: Registro, seguimiento y trazabilidad de mercancías"
        actions={
          <button className="btn btn-primary">
            <Plus size={16} />
            <span>Nuevo Envío</span>
          </button>
        }
      />

      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <input
              type="text"
              placeholder="Buscar por código de seguimiento (ej: TLA-2026-000001)..."
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: '0.875rem'
              }}
            />
            <Search size={16} style={{ position: 'absolute', left: 10, top: 12, color: '#94a3b8' }} />
          </div>
          <button className="btn btn-outline">
            <Filter size={16} />
            <span>Filtrar por Estado</span>
          </button>
        </div>

        <div style={{
          border: '1px dashed var(--border)',
          borderRadius: 8,
          padding: '3rem 1.5rem',
          textAlign: 'center',
          backgroundColor: '#fafafa'
        }}>
          <Package size={40} color="#94a3b8" style={{ marginBottom: '1rem' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Módulo de Envíos Preparado
          </h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 1.5rem auto' }}>
            Endpoints de backend configurados en <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>GET/POST /api/v1/envios</code>.
            Listo para conectar con el esquema <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>envios</code>.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <StatusBadge status="REGISTRADO" />
            <StatusBadge status="EN_TRANSITO" />
            <StatusBadge status="ENTREGADO" />
          </div>
        </div>
      </div>
    </div>
  );
}
