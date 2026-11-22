import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import axiosClient from '../api/axiosClient';
import { 
  Truck, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Wrench, 
  Ban, 
  AlertCircle, 
  CheckCircle, 
  X, 
  RefreshCw, 
  Clock, 
  Trash2,
  Edit,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function FlotaPage() {
  const { user } = useAuth();
  const [vehiculos, setVehiculos] = useState([]);
  const [metricas, setMetricas] = useState({ total: 0, disponibles: 0, en_ruta: 0, mantenimiento: 0, fuera_servicio: 0 });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtros
  const [searchPlaca, setSearchPlaca] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterCapacidadMin, setFilterCapacidadMin] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBajaModal, setShowBajaModal] = useState(false);
  const [selectedVehiculo, setSelectedVehiculo] = useState(null);

  // Formulario nuevo vehículo (HU-FLO-01)
  const initialForm = {
    placa: '',
    marca: 'Volvo',
    modelo: 'FH 460',
    anio: 2022,
    capacidadCargaKg: 25000,
    categoriaLicenciaRequerida: 'C'
  };
  const [formData, setFormData] = useState(initialForm);

  // Formulario cambio de estado (HU-FLO-04)
  const [targetEstado, setTargetEstado] = useState('MANTENIMIENTO');
  const [statusMotivo, setStatusMotivo] = useState('');

  // Formulario baja (HU-FLO-03)
  const [bajaMotivo, setBajaMotivo] = useState('Fin de vida útil o siniestro vehicular');

  const cargarVehiculos = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (searchPlaca) params.placa = searchPlaca;
      if (filterEstado) params.estado = filterEstado;
      if (filterCapacidadMin) params.capacidadMin = filterCapacidadMin;

      const res = await axiosClient.get('/flota', { params });
      if (res.data) {
        setVehiculos(res.data);
        if (res.meta?.pagination) setPagination(res.meta.pagination);
        if (res.meta?.metricas) setMetricas(res.meta.metricas);
      }
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo conectar con el microservicio de flota.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarVehiculos();
  }, [pagination.page, filterEstado]);

  const handleCrearVehiculo = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await axiosClient.post('/flota', formData);
      setSuccessMsg(`¡Vehículo con placa ${res.data?.placa} registrado exitosamente!`);
      setShowCreateModal(false);
      setFormData(initialForm);
      cargarVehiculos();
    } catch (err) {
      setErrorMsg(err.message || 'Error al registrar el vehículo');
    }
  };

  const handleCambiarEstado = async (e) => {
    e.preventDefault();
    if (!selectedVehiculo) return;
    setErrorMsg('');
    try {
      await axiosClient.patch(`/flota/${selectedVehiculo.id_vehiculo}/estado`, {
        nuevoEstado: targetEstado,
        motivo: statusMotivo
      });
      setSuccessMsg(`Estado del vehículo ${selectedVehiculo.placa} actualizado a ${targetEstado}`);
      setShowStatusModal(false);
      setStatusMotivo('');
      cargarVehiculos();
    } catch (err) {
      setErrorMsg(err.message || 'Error al cambiar estado');
    }
  };

  const handleDarDeBaja = async (e) => {
    e.preventDefault();
    if (!selectedVehiculo) return;
    setErrorMsg('');
    try {
      await axiosClient.patch(`/flota/${selectedVehiculo.id_vehiculo}/baja`, {
        motivo: bajaMotivo
      });
      setSuccessMsg(`Vehículo ${selectedVehiculo.placa} dado de baja de la flota`);
      setShowBajaModal(false);
      cargarVehiculos();
    } catch (err) {
      setErrorMsg(err.message || 'Error al dar de baja');
    }
  };

  const verHistorial = async (vehiculo) => {
    setSelectedVehiculo(vehiculo);
    setShowDetailModal(true);
    try {
      const res = await axiosClient.get(`/flota/${vehiculo.placa}`);
      if (res.data) setSelectedVehiculo(res.data);
    } catch {}
  };

  const abrirCambioEstado = (vehiculo) => {
    setSelectedVehiculo(vehiculo);
    setTargetEstado(vehiculo.estado_codigo === 'DISPONIBLE' ? 'MANTENIMIENTO' : 'DISPONIBLE');
    setStatusMotivo('');
    setShowStatusModal(true);
  };

  const abrirBaja = (vehiculo) => {
    setSelectedVehiculo(vehiculo);
    setShowBajaModal(true);
  };

  return (
    <div>
      <PageHeader
        title="Gestión de Flota Vehicular"
        subtitle="Módulo MVP 2: Control de disponibilidad, mantenimiento y capacidad de carga"
        actions={
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            <span>Registrar Vehículo</span>
          </button>
        }
      />

      {/* Alertas */}
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

      {/* Contadores / KPIs de Flota (FE-FLO-01) */}
      <div className="grid-cards" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ borderLeft: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-desc" style={{ marginBottom: 2 }}>Disponibles</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#16a34a' }}>{metricas.disponibles}</div>
            </div>
            <CheckCircle2 size={32} color="#16a34a" />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Listos para asignación</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-desc" style={{ marginBottom: 2 }}>En Ruta</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0284c7' }}>{metricas.en_ruta}</div>
            </div>
            <Truck size={32} color="#0284c7" />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>En tránsito nacional</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #ca8a04' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-desc" style={{ marginBottom: 2 }}>Mantenimiento</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ca8a04' }}>{metricas.mantenimiento}</div>
            </div>
            <Wrench size={32} color="#ca8a04" />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Revisión preventiva</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-desc" style={{ marginBottom: 2 }}>Fuera de Servicio</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#dc2626' }}>{metricas.fuera_servicio}</div>
            </div>
            <Ban size={32} color="#dc2626" />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Inactivos o baja</div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <input
              type="text"
              value={searchPlaca}
              onChange={(e) => setSearchPlaca(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && cargarVehiculos()}
              placeholder="Buscar por placa (ej: 4052-ABC) y Enter..."
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
              <option value="DISPONIBLE">Disponible</option>
              <option value="EN_RUTA">En Ruta</option>
              <option value="MANTENIMIENTO">Mantenimiento</option>
              <option value="FUERA_SERVICIO">Fuera de Servicio</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="number"
              placeholder="Capacidad Mín (kg)..."
              value={filterCapacidadMin}
              onChange={(e) => setFilterCapacidadMin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && cargarVehiculos()}
              style={{
                width: 160,
                padding: '0.6rem 0.75rem',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <button className="btn btn-outline" onClick={cargarVehiculos}>
            <RefreshCw size={14} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Tabla de Vehículos */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)', color: '#475569' }}>
                <th style={{ padding: '0.9rem 1.25rem', fontWeight: 600 }}>Placa</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Vehículo / Marca</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Año</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Capacidad de Carga</th>
                <th style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>Estado Operativo</th>
                <th style={{ padding: '0.9rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    Cargando vehículos...
                  </td>
                </tr>
              ) : vehiculos.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                    <Truck size={36} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>No se encontraron vehículos</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Registre un vehículo o cambie los criterios de búsqueda.
                    </div>
                  </td>
                </tr>
              ) : (
                vehiculos.map((v) => (
                  <tr key={v.id_vehiculo} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.9rem 1.25rem', fontWeight: 700, color: '#1e3a8a' }}>
                      {v.placa}
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <div style={{ fontWeight: 600 }}>{v.marca} {v.modelo}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Licencia requerida: Cat. {v.categoria_licencia_requerida || 'C'}</div>
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>{v.anio}</td>
                    <td style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>
                      {parseFloat(v.capacidad_carga_kg).toLocaleString()} kg
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <StatusBadge status={v.estado_codigo} />
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button
                          onClick={() => verHistorial(v)}
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          title="Ver historial de cambios operativos"
                        >
                          <Clock size={14} />
                          <span>Historial</span>
                        </button>
                        <button
                          onClick={() => abrirCambioEstado(v)}
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          title="Cambiar estado operativo"
                        >
                          <Activity size={14} />
                          <span>Estado</span>
                        </button>
                        {v.activo && v.estado_codigo !== 'EN_RUTA' && (
                          <button
                            onClick={() => abrirBaja(v)}
                            className="btn btn-outline"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#dc2626', borderColor: '#fecaca' }}
                            title="Dar de baja de la flota"
                          >
                            <Trash2 size={14} />
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

      {/* MODAL 1: REGISTRAR VEHÍCULO (HU-FLO-01) */}
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
            maxWidth: 540,
            padding: '1.75rem',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={20} color="#0f766e" />
                Registrar Vehículo en Flota (HU-FLO-01)
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCrearVehiculo}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Placa Única (ej: 4052-ABC)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="4052-ABC"
                    value={formData.placa}
                    onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Año (1980 - 2100)
                  </label>
                  <input
                    type="number"
                    required
                    min="1980"
                    max="2100"
                    value={formData.anio}
                    onChange={(e) => setFormData({ ...formData, anio: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Marca
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Modelo
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Capacidad de Carga (kg) &gt; 0
                  </label>
                  <input
                    type="number"
                    step="50"
                    min="1"
                    required
                    value={formData.capacidadCargaKg}
                    onChange={(e) => setFormData({ ...formData, capacidadCargaKg: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Cat. Licencia Exigida
                  </label>
                  <select
                    value={formData.categoriaLicenciaRequerida}
                    onChange={(e) => setFormData({ ...formData, categoriaLicenciaRequerida: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.875rem' }}
                  >
                    <option value="A">Categoría A (Livianos)</option>
                    <option value="B">Categoría B (Medianos)</option>
                    <option value="C">Categoría C (Pesados / Tráiler)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-outline">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Registrar Vehículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CAMBIAR ESTADO OPERATIVO (HU-FLO-04) */}
      {showStatusModal && selectedVehiculo && (
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
              Cambiar Estado Operativo — Placa {selectedVehiculo.placa}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Estado actual: <strong>{selectedVehiculo.estado_codigo}</strong>
            </p>

            <form onSubmit={handleCambiarEstado}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Nuevo Estado Operativo:
                </label>
                <select
                  value={targetEstado}
                  onChange={(e) => setTargetEstado(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.9rem' }}
                >
                  <option value="DISPONIBLE">DISPONIBLE (Listo para ruta)</option>
                  <option value="EN_RUTA">EN_RUTA (Operación activa)</option>
                  <option value="MANTENIMIENTO">MANTENIMIENTO (Taller técnico)</option>
                  <option value="FUERA_SERVICIO">FUERA_SERVICIO (Inoperativo)</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Motivo del Cambio <span style={{ color: '#dc2626' }}>* (Obligatorio)</span>:
                </label>
                <textarea
                  required
                  rows="3"
                  value={statusMotivo}
                  onChange={(e) => setStatusMotivo(e.target.value)}
                  placeholder="Ej: Mantenimiento preventivo de frenos y cambio de aceite..."
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowStatusModal(false)} className="btn btn-outline">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Cambio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DAR DE BAJA (HU-FLO-03) */}
      {showBajaModal && selectedVehiculo && (
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
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#dc2626', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Ban size={20} />
              Confirmar Baja de Vehículo
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '1rem' }}>
              ¿Está seguro de dar de baja al vehículo con placa <strong>{selectedVehiculo.placa}</strong> ({selectedVehiculo.marca} {selectedVehiculo.modelo})?
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Esta acción es una baja lógica: el vehículo pasará al estado <strong>FUERA DE SERVICIO</strong> y ya no podrá ser asignado a ninguna operación de transporte.
            </p>

            <form onSubmit={handleDarDeBaja}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Motivo de la baja:
                </label>
                <textarea
                  required
                  rows="2"
                  value={bajaMotivo}
                  onChange={(e) => setBajaMotivo(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowBajaModal(false)} className="btn btn-outline">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#dc2626' }}>
                  Confirmar Baja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: HISTORIAL DE VEHÍCULO */}
      {showDetailModal && selectedVehiculo && (
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
            maxWidth: 580,
            maxHeight: '85vh',
            overflowY: 'auto',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e3a8a' }}>
                  Placa: {selectedVehiculo.placa}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {selectedVehiculo.marca} {selectedVehiculo.modelo} ({selectedVehiculo.anio}) • Capacidad: {parseFloat(selectedVehiculo.capacidad_carga_kg).toLocaleString()} kg
                </div>
              </div>
              <StatusBadge status={selectedVehiculo.estado_codigo} />
            </div>

            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={16} color="#0f766e" />
                <span>Historial de Estados Operativos</span>
              </h4>
              <div style={{ borderLeft: '2px solid #e2e8f0', paddingLeft: '1rem', marginLeft: '0.5rem' }}>
                {selectedVehiculo.historial && selectedVehiculo.historial.length > 0 ? (
                  selectedVehiculo.historial.map((h, i) => (
                    <div key={i} style={{ marginBottom: '1rem', position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        left: -21,
                        top: 2,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: '#0f766e'
                      }} />
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                        {h.estado_nuevo_nombre || h.estado_nuevo_codigo}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(h.fecha_cambio).toLocaleString()} • Por: <strong>{h.usuario || 'Sistema'}</strong>
                      </div>
                      {h.motivo && (
                        <div style={{ fontSize: '0.8rem', color: '#475569', fontStyle: 'italic', marginTop: '0.2rem' }}>
                          "{h.motivo}"
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Sin cambios operativos previos registrados</div>
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
