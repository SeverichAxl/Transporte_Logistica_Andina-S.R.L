import React from 'react';

const STATUS_MAP = {
  REGISTRADO: { label: 'Registrado', type: 'info' },
  PENDIENTE: { label: 'Pendiente', type: 'warning' },
  EN_TRANSITO: { label: 'En Tránsito', type: 'warning' },
  ENTREGADO: { label: 'Entregado', type: 'success' },
  CANCELADO: { label: 'Cancelado', type: 'danger' },
  DISPONIBLE: { label: 'Disponible', type: 'success' },
  EN_RUTA: { label: 'En Ruta', type: 'info' },
  MANTENIMIENTO: { label: 'Mantenimiento', type: 'warning' },
  FUERA_DE_SERVICIO: { label: 'Fuera de Servicio', type: 'danger' },
  ACTIVO: { label: 'Activo', type: 'success' },
  INACTIVO: { label: 'Inactivo', type: 'neutral' },
  SUSPENDIDO: { label: 'Suspendido', type: 'danger' }
};

export default function StatusBadge({ status }) {
  const config = STATUS_MAP[status] || { label: status || 'Desconocido', type: 'neutral' };

  return (
    <span className={`badge badge-${config.type}`}>
      {config.label}
    </span>
  );
}
