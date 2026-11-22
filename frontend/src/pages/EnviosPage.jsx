import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import axiosClient from '../api/axiosClient';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  MapPin, 
  User, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  X,
  RefreshCw,
  FileText,
  Edit2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CIUDADES_PREDETERMINADAS = ['La Paz', 'Santa Cruz', 'Cochabamba', 'Oruro', 'Potosí', 'Sucre', 'Tarija'];

export default function EnviosPage() {
  const { user } = useAuth();
  const [envios, setEnvios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtros
  const [searchCodigo, setSearchCodigo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedEnvio, setSelectedEnvio] = useState(null);

  // Formulario nuevo envío (FE-ENV-01)
  const initialForm = {
    remitente: { tipoDocumento: 'CI', nroDocumento: '', nombreCompleto: '', telefono: '', direccion: '' },
    destinatario: { tipoDocumento: 'CI', nroDocumento: '', nombreCompleto: '', telefono: '', direccion: '' },
    origenCiudad: 'La Paz',
    origenDireccion: '',
    destinoCiudad: 'Santa Cruz',
    destinoDireccion: '',
    descripcionCarga: 'Cajas de mercadería textil',
    pesoKg: 15.5
  };
  const [formData, setFormData] = useState(initialForm);

  // Formulario cambio de estado (HU-ENV-04)
  const [targetEstado, setTargetEstado] = useState('');
  const [statusObservacion, setStatusObservacion] = useState('');

  const cargarEnvios = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (searchCodigo) params.codigo = searchCodigo;
      if (filterEstado) params.estado = filterEstado;

      const res = await axiosClient.get('/envios', { params });
      if (res.data) {
        setEnvios(res.data);
        if (res.meta) setPagination(res.meta);
      }
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo conectar con el microservicio de envíos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEnvios();
  }, [pagination.page, filterEstado]);

  const handleCrearEnvio = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await axiosClient.post('/envios', formData);
      setSuccessMsg(`¡Envío registrado exitosamente! Código generado: ${res.data?.codigo_seguimiento}`);
      setShowCreateModal(false);
      setFormData(initialForm);
      cargarEnvios();
    } catch (err) {
      setErrorMsg(err.message || 'Error al registrar el envío');
    }
  };

  const handleCambiarEstado = async (e) => {
    e.preventDefault();
    if (!selectedEnvio) return;
    setErrorMsg('');
    try {
      await axiosClient.patch(`/envios/${selectedEnvio.id_envio}/estado`, {
        nuevoEstado: targetEstado,
        observacion: statusObservacion
      });
      setSuccessMsg(`Estado actualizado a ${targetEstado} para el envío ${selectedEnvio.codigo_seguimiento}`);
      setShowStatusModal(false);
      setStatusObservacion('');
      cargarEnvios();
    } catch (err) {
      setErrorMsg(err.message || 'Error al cambiar estado');
    }
  };

  const verDetalle = async (envio) => {
    setSelectedEnvio(envio);
    setShowDetailModal(true);
    try {
      const res = await axiosClient.get(`/envios/${envio.codigo_seguimiento}`);
      if (res.data) setSelectedEnvio(res.data);
    } catch {}
  };

  const abrirCambioEstado = (envio) => {
    setSelectedEnvio(envio);
    // Sugerir la siguiente transición lógica
    if (envio.estado_codigo === 'REGISTRADO') setTargetEstado('PENDIENTE');
    else if (envio.estado_codigo === 'PENDIENTE') setTargetEstado('EN_TRANSITO');
    else if (envio.estado_codigo === 'EN_TRANSITO') setTargetEstado('ENTREGADO');
    else setTargetEstado('CANCELADO');
    setStatusObservacion('');
    setShowStatusModal(true);
  };

  return (
    <div>
      <PageHeader
        title="Gestión de Envíos"
        subtitle="Módulo MVP 1: Registro, seguimiento y trazabilidad de mercancías nacionales"
        actions={
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            <span>Nuevo Envío</span>
          </button>
        }
      />

      {/* Alertas de Notificación */}
      {successMsg && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          padding: '0.85rem 1.25rem',
          borderRadius: 8,
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '0.85rem 1.25rem',
          borderRadius: 8,
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda (FE-ENV-02) */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <input
              type="text"
              value={searchCodigo}
              onChange={(e) => setSearchCodigo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && cargarEnvios()}
              placeholder="Buscar por código (ej: TLA-2026-000001) o pulsar Enter..."
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} color="#64748b" />
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              style={{
                padding: '0.6rem 0.75rem',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: '0.875rem',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="">Todos los Estados</option>
              <option value="REGISTRADO">Registrado</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="EN_TRANSITO">En Tránsito</option>
              <option value="ENTREGADO">Entregado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          <button className="btn btn-outline" onClick={cargarEnvios}>
            <RefreshCw size={14} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Tabla de Listado de Envíos */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)', color: '#475569' }}>
                <th style={{ padding: '0.9rem 1.25rem', fontWeight: 600 }}>Código</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Ruta (Origen → Destino)</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Remitente / Destinatario</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Carga</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Estado</th>
                <th style={{ padding: '0.9rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    Cargando envíos...
                  </td>
                </tr>
              ) : envios.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                    <Package size={36} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>No se encontraron envíos</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Intente cambiar los filtros o registre un nuevo envío en el botón superior.
                    </div>
                  </td>
                </tr>
              ) : (
                envios.map((env) => (
                  <tr key={env.id_envio} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.9rem 1.25rem', fontWeight: 700, color: '#1e3a8a' }}>
                      {env.codigo_seguimiento}
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 500 }}>
                        <span>{env.origen_ciudad}</span>
                        <ArrowRight size={14} color="#94a3b8" />
                        <span>{env.destino_ciudad}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{env.destino_direccion}</div>
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <div style={{ fontSize: '0.8rem' }}><strong>De:</strong> {env.remitente_nombre || 'N/A'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#475569' }}><strong>Para:</strong> {env.destinatario_nombre || 'N/A'}</div>
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <div style={{ fontWeight: 600 }}>{env.peso_kg} kg</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{env.descripcion_carga}</div>
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <StatusBadge status={env.estado_codigo} />
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button
                          onClick={() => verDetalle(env)}
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          title="Ver detalle y trazabilidad"
                        >
                          <FileText size={14} />
                          <span>Trazabilidad</span>
                        </button>
                        {['REGISTRADO', 'PENDIENTE', 'EN_TRANSITO'].includes(env.estado_codigo) && (
                          <button
                            onClick={() => abrirCambioEstado(env)}
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                            title="Cambiar estado"
                          >
                            <span>Cambiar Estado</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: REGISTRAR NUEVO ENVÍO (FE-ENV-01) */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 680,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={20} color="#2563eb" />
                Registrar Nuevo Envío (HU-ENV-01)
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCrearEnvio}>
              {/* Sección Remitente */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e3a8a', marginBottom: '0.5rem' }}>1. Datos del Remitente</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    required
                    placeholder="Documento (CI/NIT)"
                    value={formData.remitente.nroDocumento}
                    onChange={(e) => setFormData({ ...formData, remitente: { ...formData.remitente, nroDocumento: e.target.value } })}
                    style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.85rem' }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Nombre Completo o Empresa"
                    value={formData.remitente.nombreCompleto}
                    onChange={(e) => setFormData({ ...formData, remitente: { ...formData.remitente, nombreCompleto: e.target.value } })}
                    style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.85rem' }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Teléfono de contacto"
                  value={formData.remitente.telefono}
                  onChange={(e) => setFormData({ ...formData, remitente: { ...formData.remitente, telefono: e.target.value } })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.85rem' }}
                />
              </div>

              {/* Sección Destinatario */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e3a8a', marginBottom: '0.5rem' }}>2. Datos del Destinatario</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    required
                    placeholder="Documento Receptor (CI)"
                    value={formData.destinatario.nroDocumento}
                    onChange={(e) => setFormData({ ...formData, destinatario: { ...formData.destinatario, nroDocumento: e.target.value } })}
                    style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.85rem' }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Nombre Completo del Receptor"
                    value={formData.destinatario.nombreCompleto}
                    onChange={(e) => setFormData({ ...formData, destinatario: { ...formData.destinatario, nombreCompleto: e.target.value } })}
                    style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.85rem' }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Teléfono de contacto"
                  value={formData.destinatario.telefono}
                  onChange={(e) => setFormData({ ...formData, destinatario: { ...formData.destinatario, telefono: e.target.value } })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.85rem' }}
                />
              </div>

              {/* Sección Ruta */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e3a8a', marginBottom: '0.5rem' }}>3. Ruta del Envío</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Ciudad Origen</label>
                    <select
                      value={formData.origenCiudad}
                      onChange={(e) => setFormData({ ...formData, origenCiudad: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    >
                      {CIUDADES_PREDETERMINADAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Ciudad Destino</label>
                    <select
                      value={formData.destinoCiudad}
                      onChange={(e) => setFormData({ ...formData, destinoCiudad: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    >
                      {CIUDADES_PREDETERMINADAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <input
                    type="text"
                    required
                    placeholder="Dirección exacta origen"
                    value={formData.origenDireccion}
                    onChange={(e) => setFormData({ ...formData, origenDireccion: e.target.value })}
                    style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.85rem' }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Dirección exacta destino"
                    value={formData.destinoDireccion}
                    onChange={(e) => setFormData({ ...formData, destinoDireccion: e.target.value })}
                    style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Sección Carga */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e3a8a', marginBottom: '0.5rem' }}>4. Carga y Mercancía</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Peso (kg) &gt; 0</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={formData.pesoKg}
                      onChange={(e) => setFormData({ ...formData, pesoKg: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Descripción del Contenido</label>
                    <input
                      type="text"
                      required
                      value={formData.descripcionCarga}
                      onChange={(e) => setFormData({ ...formData, descripcionCarga: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-outline">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Registrar Envío
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CAMBIO DE ESTADO CON TRANSICIÓN VÁLIDA (HU-ENV-04) */}
      {showStatusModal && selectedEnvio && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 480,
            padding: '1.75rem',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Transición de Estado — {selectedEnvio.codigo_seguimiento}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Estado actual: <strong>{selectedEnvio.estado_codigo}</strong>
            </p>

            <form onSubmit={handleCambiarEstado}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Nuevo Estado Permitido:
                </label>
                <select
                  value={targetEstado}
                  onChange={(e) => setTargetEstado(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.9rem' }}
                >
                  {selectedEnvio.estado_codigo === 'REGISTRADO' && (
                    <>
                      <option value="PENDIENTE">PENDIENTE (Aprobado para despacho)</option>
                      <option value="CANCELADO">CANCELADO (Anulación de servicio)</option>
                    </>
                  )}
                  {selectedEnvio.estado_codigo === 'PENDIENTE' && (
                    <>
                      <option value="EN_TRANSITO">EN_TRANSITO (Mercancía en viaje)</option>
                      <option value="CANCELADO">CANCELADO (Anulación de servicio)</option>
                    </>
                  )}
                  {selectedEnvio.estado_codigo === 'EN_TRANSITO' && (
                    <>
                      <option value="ENTREGADO">ENTREGADO (Confirmada la recepción)</option>
                      <option value="CANCELADO">CANCELADO (Incidencia grave)</option>
                    </>
                  )}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Observación / Motivo {targetEstado === 'CANCELADO' && <span style={{ color: '#dc2626' }}>(Obligatorio al cancelar)</span>}:
                </label>
                <textarea
                  required={targetEstado === 'CANCELADO'}
                  rows="3"
                  value={statusObservacion}
                  onChange={(e) => setStatusObservacion(e.target.value)}
                  placeholder="Detalle el motivo del cambio de estado..."
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowStatusModal(false)} className="btn btn-outline">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirmar Transición
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TRAZABILIDAD Y DETALLE (HU-ENV-03) */}
      {showDetailModal && selectedEnvio && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 620,
            maxHeight: '85vh',
            overflowY: 'auto',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e3a8a' }}>
                  {selectedEnvio.codigo_seguimiento}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Registrado el {new Date(selectedEnvio.fecha_registro).toLocaleString()}
                </div>
              </div>
              <StatusBadge status={selectedEnvio.estado_codigo} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: 8 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Remitente</div>
                <div style={{ fontWeight: 600 }}>{selectedEnvio.remitente_nombre}</div>
                <div style={{ fontSize: '0.8rem', color: '#475569' }}>{selectedEnvio.origen_ciudad} — {selectedEnvio.origen_direccion}</div>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: 8 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Destinatario</div>
                <div style={{ fontWeight: 600 }}>{selectedEnvio.destinatario_nombre}</div>
                <div style={{ fontSize: '0.8rem', color: '#475569' }}>{selectedEnvio.destino_ciudad} — {selectedEnvio.destino_direccion}</div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Detalle de Carga</div>
              <div style={{ fontSize: '0.875rem' }}>{selectedEnvio.descripcion_carga} — <strong>{selectedEnvio.peso_kg} kg</strong></div>
            </div>

            {/* Historial de Trazabilidad */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={16} color="#0f766e" />
                <span>Línea de Tiempo del Historial</span>
              </h4>
              <div style={{ borderLeft: '2px solid #e2e8f0', paddingLeft: '1rem', marginLeft: '0.5rem' }}>
                {selectedEnvio.historial && selectedEnvio.historial.length > 0 ? (
                  selectedEnvio.historial.map((h, i) => (
                    <div key={i} style={{ marginBottom: '1rem', position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        left: -21,
                        top: 2,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: '#2563eb'
                      }} />
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                        {h.estado_nuevo_nombre || h.estado_nuevo_codigo}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(h.fecha_cambio).toLocaleString()} • Por: <strong>{h.usuario || 'Sistema'}</strong>
                      </div>
                      {h.observacion && (
                        <div style={{ fontSize: '0.8rem', color: '#475569', fontStyle: 'italic', marginTop: '0.2rem' }}>
                          "{h.observacion}"
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Sin historial adicional registrado</div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button onClick={() => setShowDetailModal(false)} className="btn btn-outline">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
