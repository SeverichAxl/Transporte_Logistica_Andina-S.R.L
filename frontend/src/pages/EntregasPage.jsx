import React from 'react';
import PageHeader from '../components/common/PageHeader';
import { CheckCircle, Camera, FileText } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';

export default function EntregasPage() {
  return (
    <div>
      <PageHeader
        title="Control de Entregas y Comprobantes"
        subtitle="Módulo MVP 4: Confirmación en destino, evidencia fotográfica y comprobante digital"
      />

      <div className="grid-cards">
        <div className="card">
          <div className="card-title" style={{ color: '#0f766e' }}>
            <Camera size={18} />
            <span>Evidencias Fotográficas</span>
          </div>
          <p className="card-desc">Subida y almacenamiento local con Multer en /uploads</p>
          <span className="badge badge-success">Módulo listo para subida</span>
        </div>

        <div className="card">
          <div className="card-title" style={{ color: '#2563eb' }}>
            <FileText size={18} />
            <span>Comprobantes Digitales</span>
          </div>
          <p className="card-desc">Generación dinámica en PDF con PDFKit</p>
          <span className="badge badge-info">PDFKit configurado</span>
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
          <CheckCircle size={40} color="#94a3b8" style={{ marginBottom: '1rem' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Módulo de Entregas Preparado
          </h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto 1.5rem auto' }}>
            Endpoints de backend configurados en <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>GET/POST /api/v1/entregas</code>.
            Integración con saga de entrega para actualizar automáticamente el estado del envío a ENTREGADO.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <StatusBadge status="ENTREGADO" />
            <StatusBadge status="PENDIENTE" />
          </div>
        </div>
      </div>
    </div>
  );
}
