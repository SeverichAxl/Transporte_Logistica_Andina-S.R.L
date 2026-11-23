import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import axiosClient from '../api/axiosClient';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  Truck, 
  FileText, 
  RefreshCw, 
  X, 
  Clock, 
  ArrowRight,
  Layers,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ConductoresPage() {
  const { user } = useAuth();
  const [tabActiva, setTabActiva] = useState('conductores'); // 'conductores' | 'asignaciones'

  // Estado Conductores
  const [conductores, setConductores] = useState([]);
  const [alertas, setAlertas] = useState({ totalAlertas: 0, vencidas: [], porVencer: [] });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtros Conductores
  const [searchDoc, setSearchDoc] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  // Modales Conductores
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLicenciaModal, setShowLicenciaModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [selectedConductor, setSelectedConductor] = useState(null);

  // Formulario nuevo conductor (HU-CON-01)
  const initialForm = {
    tipoDocumento: 'CI',
    nroDocumento: '',
    nombres: '',
    apellidos: '',
    fechaNacimiento: '1990-05-15',
    telefono: '',
    email: '',
    direccion: '',
    licencia: {
      nroLicencia: '',
      idCategoria: 3, // Cat C por defecto
      fechaVencimiento: '2028-12-31'
    }
  };
  const [formData, setFormData] = useState(initialForm);

  // Formulario renovar licencia (HU-CON-02)
  const [licenciaForm, setLicenciaForm] = useState({
    nroLicencia: '',
    idCategoria: 3,
    fechaVencimiento: '2029-01-01'
  });

  // Estado Asignaciones (HU-CON-04 / FE-CON-02)
  const [asignaciones, setAsignaciones] = useState([]);
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [enviosPendientes, setEnviosPendientes] = useState([]);
  const [vehiculosDisponibles, setVehiculosDisponibles] = useState([]);
  const [conductoresDisponibles, setConductoresDisponibles] = useState([]);
  const [asignacionForm, setAsignacionForm] = useState({
    codigoEnvio: '',
    placaVehiculo: '',
    idConductor: '',
    observaciones: 'Asignación de ruta interdepartamental'
  });

  // Cargar lista de conductores y alertas
  const cargarConductores = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (searchDoc) params.documento = searchDoc;
      if (filterEstado) params.estado = filterEstado;

      const [resCond, resAlertas] = await Promise.allSettled([
        axiosClient.get('/conductores', { params }),
        axiosClient.get('/conductores/alertas/licencias', { params: { dias: 45 } })
      ]);

      if (resCond.status === 'fulfilled' && resCond.value?.data) {
        setConductores(resCond.value.data);
        if (resCond.value.meta) setPagination(resCond.value.meta);
      }
      if (resAlertas.status === 'fulfilled' && resAlertas.value?.data) {
        setAlertas(resAlertas.value.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al conectar con MS-Conductores');
    } finally {
      setLoading(false);
    }
  };

  // Cargar lista de asignaciones
  const cargarAsignaciones = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await axiosClient.get('/conductores/asignaciones');
      if (res.data) setAsignaciones(res.data);
    } catch (err) {
      setErrorMsg(err.message || 'Error al cargar asignaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tabActiva === 'conductores') {
      cargarConductores();
    } else {
      cargarAsignaciones();
    }
  }, [tabActiva, pagination.page, filterEstado]);

  const handleCrearConductor = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await axiosClient.post('/conductores', formData);
      setSuccessMsg(`¡Conductor ${formData.nombres} ${formData.apellidos} registrado exitosamente!`);
      setShowCreateModal(false);
      setFormData(initialForm);
      cargarConductores();
    } catch (err) {
      setErrorMsg(err.message || 'Error al registrar conductor');
    }
  };

  const handleRenovarLicencia = async (e) => {
    e.preventDefault();
    if (!selectedConductor) return;
    setErrorMsg('');
    try {
      await axiosClient.post(`/conductores/${selectedConductor.id_conductor}/licencias`, licenciaForm);
      setSuccessMsg(`Licencia renovada para ${selectedConductor.nombre_completo}`);
      setShowLicenciaModal(false);
      cargarConductores();
    } catch (err) {
      setErrorMsg(err.message || 'Error al renovar licencia');
    }
  };

  // Abrir modal asistente de asignación (carga listas dependientes)
  const abrirAsistenteAsignacion = async () => {
    setErrorMsg('');
    try {
      const [resEnvios, resVehiculos, resCond] = await Promise.all([
        axiosClient.get('/envios', { params: { limit: 50 } }),
        axiosClient.get('/flota', { params: { estado: 'DISPONIBLE', limit: 50 } }),
        axiosClient.get('/conductores', { params: { estado: 'DISPONIBLE', limit: 50 } })
      ]);

      const pend = (resEnvios.data || []).filter(e => ['REGISTRADO', 'PENDIENTE'].includes(e.estado_codigo));
      setEnviosPendientes(pend);
      setVehiculosDisponibles(resVehiculos.data || []);
      setConductoresDisponibles(resCond.data || []);

      setAsignacionForm({
        codigoEnvio: pend[0]?.codigo_seguimiento || '',
        placaVehiculo: resVehiculos.data?.[0]?.placa || '',
        idConductor: resCond.data?.[0]?.id_conductor || '',
        observaciones: 'Asignación inmediata'
      });

      setShowAsignarModal(true);
    } catch (err) {
      setErrorMsg('No se pudieron cargar recursos para la asignación: ' + (err.message || ''));
    }
  };

  const handleCrearAsignacion = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await axiosClient.post('/conductores/asignaciones', {
        codigoEnvio: asignacionForm.codigoEnvio,
        placaVehiculo: asignacionForm.placaVehiculo,
        idConductor: parseInt(asignacionForm.idConductor, 10),
        observaciones: asignacionForm.observaciones
      }, {
        headers: { 'Idempotency-Key': `asig-${Date.now()}` }
      });
      setSuccessMsg(`¡Asignación creada y saga ejecutada exitosamente!`);
      setShowAsignarModal(false);
      cargarAsignaciones();
    } catch (err) {
      setErrorMsg(err.message || 'Error al ejecutar la saga de asignación');
    }
  };

  const handleFinalizarAsignacion = async (idAsignacion) => {
    if (!window.confirm('¿Desea finalizar esta asignación y liberar al conductor y vehículo?')) return;
    setErrorMsg('');
    try {
      await axiosClient.patch(`/conductores/asignaciones/${idAsignacion}/finalizar`, {
        observacion: 'Cierre manual de operación'
      });
      setSuccessMsg('Asignación finalizada. Conductor y vehículo liberados a DISPONIBLE.');
      cargarAsignaciones();
    } catch (err) {
      setErrorMsg(err.message || 'Error al finalizar asignación');
    }
  };

  return (
    <div>
      <PageHeader
        title="Gestión de Conductores y Asignaciones"
        subtitle="Módulo MVP 3: Control de licencias vigentes, legajos y orquestación de asignaciones"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {tabActiva === 'conductores' ? (
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={16} />
                <span>Nuevo Conductor</span>
              </button>
            ) : (
              <button 
                className="btn btn-primary"
                onClick={abrirAsistenteAsignacion}
              >
                <Plus size={16} />
                <span>Nueva Asignación (Saga)</span>
              </button>
            )}
          </div>
        }
      />

      {/* Selector de Pestañas */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--c-slate-border)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setTabActiva('conductores')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.875rem',
            backgroundColor: tabActiva === 'conductores' ? '#0A0908' : 'transparent',
            color: tabActiva === 'conductores' ? '#FFFFFF' : 'var(--c-slate-dark)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Users size={16} color={tabActiva === 'conductores' ? '#43C59E' : 'currentColor'} />
          <span>Conductores y Licencias</span>
        </button>

        <button
          onClick={() => setTabActiva('asignaciones')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.875rem',
            backgroundColor: tabActiva === 'asignaciones' ? '#0A0908' : 'transparent',
            color: tabActiva === 'asignaciones' ? '#FFFFFF' : 'var(--c-slate-dark)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Layers size={16} color={tabActiva === 'asignaciones' ? '#43C59E' : 'currentColor'} />
          <span>Asignaciones de Operación (Saga INT-01)</span>
        </button>
      </div>

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
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-danger)' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* VISTA 1: CONDUCTORES */}
      {tabActiva === 'conductores' && (
        <>
          {/* Banner de Alertas de Licencias (HU-CON-03) */}
          {alertas.totalAlertas > 0 && (
            <div className="card" style={{ 
              marginBottom: '1.5rem', 
              backgroundColor: '#FFFAF0', 
              borderColor: 'var(--c-warning-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(221, 107, 32, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={20} color="var(--c-warning)" />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--c-dark)' }}>
                    Atención: {alertas.totalAlertas} conductor(es) con alertas de licencia
                  </h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--c-text-secondary)', marginTop: 2 }}>
                    {alertas.vencidas?.length || 0} vencida(s) y {alertas.porVencer?.length || 0} por vencer en los próximos 45 días.
                  </div>
                </div>
              </div>
              <span className="badge badge-warning">HU-CON-03 Activa</span>
            </div>
          )}

          {/* Barra de Filtros */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                <input
                  type="text"
                  value={searchDoc}
                  onChange={(e) => setSearchDoc(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && cargarConductores()}
                  placeholder="Buscar por CI/Documento y Enter..."
                  style={{ width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.25rem', fontSize: '0.875rem' }}
                />
                <Search size={16} style={{ position: 'absolute', left: 10, top: 13, color: 'var(--c-slate)' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={16} color="var(--c-slate)" />
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  style={{ padding: '0.65rem 0.85rem', fontSize: '0.875rem' }}
                >
                  <option value="">Todos los Estados</option>
                  <option value="DISPONIBLE">Disponible</option>
                  <option value="OCUPADO">Ocupado</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>

              <button className="btn btn-outline" onClick={cargarConductores}>
                <RefreshCw size={14} color="var(--c-slate-dark)" />
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          {/* Tabla de Conductores */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Conductor / Documento</th>
                    <th>Contacto</th>
                    <th>Licencia Vigente</th>
                    <th>Vencimiento</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--c-text-muted)' }}>
                        Cargando conductores...
                      </td>
                    </tr>
                  ) : conductores.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                        <Users size={40} color="var(--c-slate)" style={{ marginBottom: '0.5rem' }} />
                        <div style={{ fontWeight: 700, color: 'var(--c-dark)' }}>No se encontraron conductores</div>
                        <div style={{ fontSize: '0.825rem', color: 'var(--c-text-secondary)', marginTop: '0.25rem' }}>
                          Registre un nuevo conductor con el botón superior.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    conductores.map((c) => (
                      <tr key={c.id_conductor}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--c-dark)' }}>
                            {c.nombre_completo || `${c.nombres} ${c.apellidos}`}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--c-slate-dark)' }}>
                            {c.tipo_documento}: {c.nro_documento}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.825rem' }}>{c.telefono || 'Sin teléfono'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)' }}>{c.email || 'Sin correo'}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--c-dark)' }}>
                              Cat. {c.categoria_licencia || c.licencia_vigente?.categoria || 'C'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--c-slate-dark)' }}>
                              ({c.nro_licencia || c.licencia_vigente?.nro_licencia || 'S/N'})
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                            {c.licencia_vencimiento || c.licencia_vigente?.fecha_vencimiento ? 
                              new Date(c.licencia_vencimiento || c.licencia_vigente?.fecha_vencimiento).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={c.estado_codigo} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem' }}>
                            <button
                              onClick={() => {
                                setSelectedConductor(c);
                                setLicenciaForm({
                                  nroLicencia: c.nro_licencia || '',
                                  idCategoria: 3,
                                  fechaVencimiento: '2029-12-31'
                                });
                                setShowLicenciaModal(true);
                              }}
                              className="btn btn-outline"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                              title="Renovar licencia (HU-CON-02)"
                            >
                              <Award size={13} color="var(--c-slate-dark)" />
                              <span>Renovar Licencia</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* VISTA 2: ASIGNACIONES (SAGA INT-01) */}
      {tabActiva === 'asignaciones' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Envío Asignado</th>
                  <th>Vehículo (Placa)</th>
                  <th>Conductor</th>
                  <th>Fecha Asignación</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--c-text-muted)' }}>
                      Cargando asignaciones operativas...
                    </td>
                  </tr>
                ) : asignaciones.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                      <Layers size={40} color="var(--c-slate)" style={{ marginBottom: '0.5rem' }} />
                      <div style={{ fontWeight: 700, color: 'var(--c-dark)' }}>No hay asignaciones registradas</div>
                      <div style={{ fontSize: '0.825rem', color: 'var(--c-text-secondary)', marginTop: '0.25rem' }}>
                        Use el botón "Nueva Asignación" para vincular un envío pendiente con su vehículo y conductor.
                      </div>
                    </td>
                  </tr>
                ) : (
                  asignaciones.map((a) => (
                    <tr key={a.id_asignacion}>
                      <td style={{ fontWeight: 700, color: 'var(--c-slate-dark)' }}>#{a.id_asignacion}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0A0908' }}>{a.codigo_seguimiento || `Envío #${a.id_envio}`}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)' }}>{a.origen_ciudad} → {a.destino_ciudad}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--c-dark)' }}>{a.placa_vehiculo || `Vehículo #${a.id_vehiculo}`}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--c-slate-dark)' }}>{a.vehiculo_marca} {a.vehiculo_modelo}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--c-dark)' }}>{a.conductor_nombre || `Conductor #${a.id_conductor}`}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)' }}>CI: {a.conductor_documento}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.825rem' }}>{new Date(a.fecha_asignacion || a.created_at).toLocaleString()}</div>
                      </td>
                      <td>
                        <StatusBadge status={a.estado_codigo || (a.fecha_fin ? 'FINALIZADA' : 'ACTIVA')} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {!a.fecha_fin && a.estado_codigo !== 'CANCELADA' && (
                          <button
                            onClick={() => handleFinalizarAsignacion(a.id_asignacion)}
                            className="btn btn-dark"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                            title="Liberar recursos y finalizar asignación"
                          >
                            <span>Finalizar</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTRAR CONDUCTOR (HU-CON-01) */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--c-slate-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--c-mint-light)', color: 'var(--c-mint-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--c-dark)' }}>
                    Registrar Nuevo Conductor (HU-CON-01)
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--c-text-secondary)' }}>
                    Valida mayoría de edad (≥18 años) y asocia licencia vigente
                  </div>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-slate)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCrearConductor}>
              {/* Datos Personales */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--c-slate-dark)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  1. Datos Personales
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    required
                    placeholder="Documento (CI)"
                    value={formData.nroDocumento}
                    onChange={(e) => setFormData({ ...formData, nroDocumento: e.target.value })}
                    style={{ padding: '0.55rem', fontSize: '0.85rem' }}
                  />
                  <input
                    type="date"
                    required
                    title="Fecha de Nacimiento (Debe ser mayor de edad)"
                    value={formData.fechaNacimiento}
                    onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                    style={{ padding: '0.55rem', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    required
                    placeholder="Nombres"
                    value={formData.nombres}
                    onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                    style={{ padding: '0.55rem', fontSize: '0.85rem' }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Apellidos"
                    value={formData.apellidos}
                    onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                    style={{ padding: '0.55rem', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <input
                    type="text"
                    placeholder="Teléfono"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    style={{ padding: '0.55rem', fontSize: '0.85rem' }}
                  />
                  <input
                    type="email"
                    placeholder="Correo Electrónico"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ padding: '0.55rem', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Datos de Licencia */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--c-slate-dark)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  2. Licencia de Conducir
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--c-text-secondary)', display: 'block', marginBottom: 2 }}>Nro. Licencia</label>
                    <input
                      type="text"
                      required
                      placeholder="LIC-1234567"
                      value={formData.licencia.nroLicencia}
                      onChange={(e) => setFormData({ ...formData, licencia: { ...formData.licencia, nroLicencia: e.target.value } })}
                      style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--c-text-secondary)', display: 'block', marginBottom: 2 }}>Categoría</label>
                    <select
                      value={formData.licencia.idCategoria}
                      onChange={(e) => setFormData({ ...formData, licencia: { ...formData.licencia, idCategoria: parseInt(e.target.value, 10) } })}
                      style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem' }}
                    >
                      <option value={1}>A (Liviano)</option>
                      <option value={2}>B (Mediano)</option>
                      <option value={3}>C (Pesado)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--c-text-secondary)', display: 'block', marginBottom: 2 }}>Fecha Vencimiento</label>
                    <input
                      type="date"
                      required
                      value={formData.licencia.fechaVencimiento}
                      onChange={(e) => setFormData({ ...formData, licencia: { ...formData.licencia, fechaVencimiento: e.target.value } })}
                      style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-outline">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Registrar Conductor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RENOVAR LICENCIA (HU-CON-02) */}
      {showLicenciaModal && selectedConductor && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--c-dark)', marginBottom: '0.35rem' }}>
              Renovar Licencia de Conducir
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--c-text-secondary)', marginBottom: '1.25rem' }}>
              Conductor: <strong>{selectedConductor.nombre_completo || selectedConductor.nombres}</strong>
            </p>

            <form onSubmit={handleRenovarLicencia}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Nro. Nueva Licencia</label>
                <input
                  type="text"
                  required
                  value={licenciaForm.nroLicencia}
                  onChange={(e) => setLicenciaForm({ ...licenciaForm, nroLicencia: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Categoría</label>
                  <select
                    value={licenciaForm.idCategoria}
                    onChange={(e) => setLicenciaForm({ ...licenciaForm, idCategoria: parseInt(e.target.value, 10) })}
                    style={{ width: '100%', padding: '0.6rem', fontSize: '0.875rem' }}
                  >
                    <option value={1}>Cat. A</option>
                    <option value={2}>Cat. B</option>
                    <option value={3}>Cat. C</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Nuevo Vencimiento</label>
                  <input
                    type="date"
                    required
                    value={licenciaForm.fechaVencimiento}
                    onChange={(e) => setLicenciaForm({ ...licenciaForm, fechaVencimiento: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowLicenciaModal(false)} className="btn btn-outline">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Registrar Renovación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ASISTENTE DE ASIGNACIÓN (SAGA INT-01 / FE-CON-02) */}
      {showAsignarModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--c-slate-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--c-mint-light)', color: 'var(--c-mint-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Layers size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--c-dark)' }}>
                    Asistente de Asignación de Operaciones (Saga INT-01)
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--c-text-secondary)' }}>
                    Orquesta Envío → Vehículo Disponible → Conductor con Licencia Vigente
                  </div>
                </div>
              </div>
              <button onClick={() => setShowAsignarModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-slate)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCrearAsignacion}>
              {/* Selección de Envío */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-dark)', display: 'block', marginBottom: '0.35rem' }}>
                  1. Envío Pendiente de Despacho:
                </label>
                {enviosPendientes.length === 0 ? (
                  <div style={{ fontSize: '0.825rem', color: 'var(--c-warning)', backgroundColor: 'var(--c-warning-bg)', padding: '0.75rem', borderRadius: 6 }}>
                    No hay envíos registrados o pendientes disponibles para despacho. Registre uno primero en el módulo de Envíos.
                  </div>
                ) : (
                  <select
                    required
                    value={asignacionForm.codigoEnvio}
                    onChange={(e) => setAsignacionForm({ ...asignacionForm, codigoEnvio: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', fontSize: '0.875rem' }}
                  >
                    {enviosPendientes.map(e => (
                      <option key={e.id_envio} value={e.codigo_seguimiento}>
                        {e.codigo_seguimiento} — {e.origen_ciudad} → {e.destino_ciudad} ({e.peso_kg} kg)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Selección de Vehículo */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-dark)', display: 'block', marginBottom: '0.35rem' }}>
                  2. Vehículo de Flota Disponible:
                </label>
                {vehiculosDisponibles.length === 0 ? (
                  <div style={{ fontSize: '0.825rem', color: 'var(--c-danger)', backgroundColor: 'var(--c-danger-bg)', padding: '0.75rem', borderRadius: 6 }}>
                    No hay vehículos en estado DISPONIBLE en la flota.
                  </div>
                ) : (
                  <select
                    required
                    value={asignacionForm.placaVehiculo}
                    onChange={(e) => setAsignacionForm({ ...asignacionForm, placaVehiculo: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', fontSize: '0.875rem' }}
                  >
                    {vehiculosDisponibles.map(v => (
                      <option key={v.id_vehiculo} value={v.placa}>
                        {v.placa} — {v.marca} {v.modelo} (Capacidad: {parseFloat(v.capacidad_carga_kg).toLocaleString()} kg)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Selección de Conductor */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-dark)', display: 'block', marginBottom: '0.35rem' }}>
                  3. Conductor Titular Disponible:
                </label>
                {conductoresDisponibles.length === 0 ? (
                  <div style={{ fontSize: '0.825rem', color: 'var(--c-danger)', backgroundColor: 'var(--c-danger-bg)', padding: '0.75rem', borderRadius: 6 }}>
                    No hay conductores en estado DISPONIBLE.
                  </div>
                ) : (
                  <select
                    required
                    value={asignacionForm.idConductor}
                    onChange={(e) => setAsignacionForm({ ...asignacionForm, idConductor: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', fontSize: '0.875rem' }}
                  >
                    {conductoresDisponibles.map(c => (
                      <option key={c.id_conductor} value={c.id_conductor}>
                        {c.nombre_completo || `${c.nombres} ${c.apellidos}`} — CI: {c.nro_documento} (Lic: Cat. {c.categoria_licencia || 'C'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowAsignarModal(false)} className="btn btn-outline">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={enviosPendientes.length === 0 || vehiculosDisponibles.length === 0 || conductoresDisponibles.length === 0}
                  className="btn btn-primary"
                >
                  Ejecutar Asignación (Saga)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
