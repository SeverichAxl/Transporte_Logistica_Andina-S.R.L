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
  X, 
  RefreshCw, 
  Clock, 
  Trash2,
  Activity,
  ShieldCheck
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
          backgroundColor: 'var(--c-mint-light)',
          border: '1px solid var(--c-mint-border)',
          color: 'var(--c-mint-dark)',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 500,
          fontSize: '0.875rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} color="var(--c-mint-dark)" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-mint-dark)' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div style={{
          backgroundColor: 'var(--c-danger-bg)',
          border: '1px solid var(--c-danger-border)',
          color: 'var(--c-danger)',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 500,
          fontSize: '0.875rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-danger)' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tarjetas de Métricas de Flota (FE-FLO-01) */}
      <div className="grid-cards">
        <div className="card" style={{ borderTop: '3px solid var(--c-mint)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-slate-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Disponibles</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--c-mint-dark)', marginTop: 2 }}>{metricas.disponibles}</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--c-mint-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={22} color="var(--c-mint-dark)" />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', marginTop: '0.5rem' }}>Listos para asignación inmediata</div>
        </div>

        <div className="card" style={{ borderTop: '3px solid var(--c-slate)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-slate-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>En Ruta</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--c-slate-dark)', marginTop: 2 }}>{metricas.en_ruta}</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--c-slate-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={22} color="var(--c-slate-dark)" />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', marginTop: '0.5rem' }}>En tránsito nacional</div>
        </div>

        <div className="card" style={{ borderTop: '3px solid var(--c-warning)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-slate-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mantenimiento</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--c-warning)', marginTop: 2 }}>{metricas.mantenimiento}</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--c-warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wrench size={22} color="var(--c-warning)" />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', marginTop: '0.5rem' }}>Revisión preventiva</div>
        </div>

        <div className="card" style={{ borderTop: '3px solid var(--c-danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-slate-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fuera de Servicio</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--c-danger)', marginTop: 2 }}>{metricas.fuera_servicio}</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--c-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ban size={22} color="var(--c-danger)" />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', marginTop: '0.5rem' }}>Baja lógica o inoperativo</div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
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
                padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                fontSize: '0.875rem'
              }}
            />
            <Search size={16} style={{ position: 'absolute', left: 10, top: 13, color: 'var(--c-slate)' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} color="var(--c-slate)" />
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              style={{
                padding: '0.65rem 0.85rem',
                fontSize: '0.875rem'
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
                width: 170,
                padding: '0.65rem 0.75rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <button className="btn btn-outline" onClick={cargarVehiculos}>
            <RefreshCw size={14} color="var(--c-slate-dark)" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Tabla de Flota */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Placa</th>
                <th>Vehículo / Marca</th>
                <th>Año</th>
                <th>Capacidad de Carga</th>
                <th>Estado Operativo</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--c-text-muted)' }}>
                    Cargando flota vehicular...
                  </td>
                </tr>
              ) : vehiculos.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                    <Truck size={40} color="var(--c-slate)" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontWeight: 700, color: 'var(--c-dark)' }}>No se encontraron vehículos</div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--c-text-secondary)', marginTop: '0.25rem' }}>
                      Registre una unidad o modifique los criterios de búsqueda.
                    </div>
                  </td>
                </tr>
              ) : (
                vehiculos.map((v) => (
                  <tr key={v.id_vehiculo}>
                    <td style={{ fontWeight: 700, color: 'var(--c-dark)', letterSpacing: '0.04em' }}>
                      {v.placa}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--c-dark)' }}>{v.marca} {v.modelo}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--c-text-secondary)' }}>Licencia: Cat. {v.categoria_licencia_requerida || 'C'}</div>
                    </td>
                    <td style={{ color: 'var(--c-text-primary)' }}>{v.anio}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--c-dark)' }}>
                        {parseFloat(v.capacidad_carga_kg).toLocaleString()} kg
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={v.estado_codigo} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem' }}>
                        <button
                          onClick={() => verHistorial(v)}
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.7rem', fontSize: '0.775rem' }}
                          title="Ver historial operativo"
                        >
                          <Clock size={13} color="var(--c-slate-dark)" />
                          <span>Historial</span>
                        </button>
                        <button
                          onClick={() => abrirCambioEstado(v)}
                          className="btn btn-dark"
                          style={{ padding: '0.35rem 0.7rem', fontSize: '0.775rem' }}
                          title="Cambiar estado operativo"
                        >
                          <Activity size={13} color="var(--c-mint)" />
                          <span>Estado</span>
                        </button>
                        {v.activo && v.estado_codigo !== 'EN_RUTA' && (
                          <button
                            onClick={() => abrirBaja(v)}
                            className="btn btn-outline"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.775rem', color: 'var(--c-danger)', borderColor: 'var(--c-danger-border)' }}
                            title="Dar de baja definitiva de la flota"
                          >
                            <Trash2 size={13} />
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
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--c-slate-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--c-mint-light)',
                  color: 'var(--c-mint-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Truck size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--c-dark)' }}>
                    Registrar Vehículo en Flota
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--c-text-secondary)' }}>
                    Estado inicial DISPONIBLE con verificación de placa única
                  </div>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-slate)' }}>
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
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.875rem' }}
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
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.875rem' }}
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
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.875rem' }}
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
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Capacidad Carga (kg) &gt; 0
                  </label>
                  <input
                    type="number"
                    step="50"
                    min="1"
                    required
                    value={formData.capacidadCargaKg}
                    onChange={(e) => setFormData({ ...formData, capacidadCargaKg: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Cat. Licencia Exigida
                  </label>
                  <select
                    value={formData.categoriaLicenciaRequerida}
                    onChange={(e) => setFormData({ ...formData, categoriaLicenciaRequerida: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.875rem' }}
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
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--c-dark)', marginBottom: '0.25rem' }}>
              Cambiar Estado Operativo
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--c-text-secondary)', marginBottom: '1.25rem' }}>
              Placa <strong>{selectedVehiculo.placa}</strong> (Actual: <span style={{ fontWeight: 600 }}>{selectedVehiculo.estado_codigo}</span>)
            </p>

            <form onSubmit={handleCambiarEstado}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Nuevo Estado Operativo:
                </label>
                <select
                  value={targetEstado}
                  onChange={(e) => setTargetEstado(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', fontSize: '0.875rem' }}
                >
                  <option value="DISPONIBLE">DISPONIBLE (Listo para ruta)</option>
                  <option value="EN_RUTA">EN_RUTA (Operación activa)</option>
                  <option value="MANTENIMIENTO">MANTENIMIENTO (Taller técnico)</option>
                  <option value="FUERA_SERVICIO">FUERA_SERVICIO (Inoperativo)</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Motivo del Cambio <span style={{ color: 'var(--c-danger)' }}>* (Obligatorio)</span>:
                </label>
                <textarea
                  required
                  rows="3"
                  value={statusMotivo}
                  onChange={(e) => setStatusMotivo(e.target.value)}
                  placeholder="Ej: Mantenimiento preventivo de frenos y cambio de aceite..."
                  style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem' }}
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
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--c-danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Ban size={20} />
              Confirmar Baja de Vehículo
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--c-dark)', marginBottom: '0.75rem' }}>
              ¿Está seguro de dar de baja al vehículo con placa <strong>{selectedVehiculo.placa}</strong> ({selectedVehiculo.marca} {selectedVehiculo.modelo})?
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--c-text-muted)', marginBottom: '1.25rem' }}>
              Baja lógica: El vehículo pasará al estado <strong>FUERA DE SERVICIO</strong> y dejará de ser asignable a operaciones de transporte.
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
                  style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowBajaModal(false)} className="btn btn-outline">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--c-danger)', color: '#FFFFFF' }}>
                  Confirmar Baja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: HISTORIAL DE VEHÍCULO */}
      {showDetailModal && selectedVehiculo && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 580 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--c-slate-border)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--c-dark)' }}>
                  Placa: {selectedVehiculo.placa}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)' }}>
                  {selectedVehiculo.marca} {selectedVehiculo.modelo} ({selectedVehiculo.anio}) • Capacidad: {parseFloat(selectedVehiculo.capacidad_carga_kg).toLocaleString()} kg
                </div>
              </div>
              <StatusBadge status={selectedVehiculo.estado_codigo} />
            </div>

            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--c-dark)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Clock size={16} color="var(--c-mint-dark)" />
                <span>Historial de Estados Operativos</span>
              </h4>
              <div style={{ borderLeft: '2px solid var(--c-slate-border)', paddingLeft: '1rem', marginLeft: '0.5rem' }}>
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
                        backgroundColor: 'var(--c-mint)'
                      }} />
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--c-dark)' }}>
                        {h.estado_nuevo_nombre || h.estado_nuevo_codigo}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)' }}>
                        {new Date(h.fecha_cambio).toLocaleString()} • Por: <strong>{h.usuario || 'Sistema'}</strong>
                      </div>
                      {h.motivo && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--c-text-secondary)', fontStyle: 'italic', marginTop: '0.2rem' }}>
                          "{h.motivo}"
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--c-text-muted)' }}>Sin historial registrado</div>
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
