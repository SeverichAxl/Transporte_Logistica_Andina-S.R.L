import React from 'react';

const STATUS_CONFIG = {
  // Envíos
  REGISTRADO: { label: 'Registrado', className: 'badge-slate' },
  PENDIENTE: { label: 'Pendiente', className: 'badge-warning' },
  EN_TRANSITO: { label: 'En Tránsito', className: 'badge-slate' },
  ENTREGADO: { label: 'Entregado', className: 'badge-mint' },
  CANCELADO: { label: 'Cancelado', className: 'badge-danger' },

  // Flota
  DISPONIBLE: { label: 'Disponible', className: 'badge-mint' },
  EN_RUTA: { label: 'En Ruta', className: 'badge-slate' },
  MANTENIMIENTO: { label: 'Mantenimiento', className: 'badge-warning' },
  FUERA_SERVICIO: { label: 'Fuera de Servicio', className: 'badge-danger' },
  FUERA_DE_SERVICIO: { label: 'Fuera de Servicio', className: 'badge-danger' },

  // Conductores
  ACTIVO: { label: 'Activo', className: 'badge-mint' },
  OCUPADO: { label: 'Ocupado', className: 'badge-slate' },
  INACTIVO: { label: 'Inactivo', className: 'badge-danger' },
  SUSPENDIDO: { label: 'Suspendido', className: 'badge-danger' }
};

export default function StatusBadge({ status }) {
  const normStatus = (status || '').toUpperCase().trim();
  const config = STATUS_CONFIG[normStatus] || { label: status || 'Desconocido', className: 'badge-slate' };

  return (
    <span className={`badge ${config.className}`}>
      {config.label}
    </span>
  );
}
