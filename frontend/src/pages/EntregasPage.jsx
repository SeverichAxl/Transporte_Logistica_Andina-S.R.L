import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import axiosClient from '../api/axiosClient';
import { 
  CheckCircle, 
  Camera, 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  RefreshCw,
  UserCheck,
  Calendar,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function EntregasPage() {
  const { user } = useAuth();
  const [tabActiva, setTabActiva] = useState('entregas'); // 'entregas' | 'confirmar'

  // Estados
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtros
  const [searchReceptor, setSearchReceptor] = useState('');
  const [searchCodigo, setSearchCodigo] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  // Modales
  const [showEvidenciaModal, setShowEvidenciaModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [selectedEntrega, setSelectedEntrega] = useState(null);

  // Formulario Confirmar Entrega (HU-ENT-01 / FE-ENT-01)
  const [enviosEnTransito, setEnviosEnTransito] = useState([]);
  const [formData, setFormData] = useState({
    codigoEnvio: '',
    nombreReceptor: '',
    documentoReceptor: '',
    fechaHoraEntrega: new Date().toISOString().slice(0, 16),
    observaciones: 'Recepción conforme en destino'
  });
  const [archivosEvidencia, setArchivosEvidencia] = useState([]);

  // Subida de evidencias posterior (HU-ENT-02)
  const [fotosSubir, setFotosSubir] = useState([]);

  const cargarEntregas = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (searchReceptor) params.receptor = searchReceptor;
      if (searchCodigo) params.codigo = searchCodigo;

      const res = await axiosClient.get('/entregas', { params });
      if (res.data) {
        setEntregas(res.data);
        if (res.meta) setPagination(res.meta);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al conectar con MS-Entregas');
    } finally {
      setLoading(false);
    }
  };

  const cargarEnviosEnTransito = async () => {
    try {
      const res = await axiosClient.get('/envios', { params: { limit: 50 } });
      const transito = (res.data || []).filter(e => e.estado_codigo === 'EN_TRANSITO');
      setEnviosEnTransito(transito);
      if (transito.length > 0 && !formData.codigoEnvio) {
        setFormData(prev => ({ ...prev, codigoEnvio: transito[0].codigo_seguimiento }));
      }
    } catch {}
  };

  useEffect(() => {
    cargarEntregas();
    cargarEnviosEnTransito();
  }, [pagination.page]);

  const handleConfirmarEntrega = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        codigoEnvio: formData.codigoEnvio,
        nombreReceptor: formData.nombreReceptor.trim(),
        documentoReceptor: formData.documentoReceptor.trim(),
        fechaHoraEntrega: formData.fechaHoraEntrega,
        observaciones: formData.observaciones
      };

      const res = await axiosClient.post('/entregas', payload, {
        headers: { 'Idempotency-Key': `ent-${Date.now()}` }
      });

      const entregaCreada = res.data;
      const idEntrega = entregaCreada?.id_entrega || entregaCreada?.entrega?.id_entrega;

      // Subir fotos si se seleccionaron
      if (idEntrega && archivosEvidencia.length > 0) {
        const formDataFiles = new FormData();
        Array.from(archivosEvidencia).forEach(f => formDataFiles.append('fotos', f));
        try {
          await axiosClient.post(`/entregas/${idEntrega}/evidencias`, formDataFiles, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (subErr) {
          console.warn('Fotos no adjuntadas:', subErr);
        }
      }

      setSuccessMsg(`¡Entrega confirmada y comprobante digital emitido para ${formData.codigoEnvio}!`);
      setFormData({
        codigoEnvio: '',
        nombreReceptor: '',
        documentoReceptor: '',
        fechaHoraEntrega: new Date().toISOString().slice(0, 16),
        observaciones: 'Recepción conforme en destino'
      });
      setArchivosEvidencia([]);
      setTabActiva('entregas');
      cargarEntregas();
      cargarEnviosEnTransito();
    } catch (err) {
      setErrorMsg(err.message || 'Error al confirmar la entrega');
    }
  };

  const handleDescargarComprobante = (idEntrega) => {
    const url = `http://localhost:3000/api/v1/entregas/${idEntrega}/comprobante`;
    window.open(url, '_blank');
  };

  const verDetalleEntrega = async (entrega) => {
    setSelectedEntrega(entrega);
    setShowDetalleModal(true);
    try {
      const res = await axiosClient.get(`/entregas/${entrega.id_entrega}`);
      if (res.data) setSelectedEntrega(res.data);
    } catch {}
  };

  const handleSubirFotosAdicionales = async (e) => {
    e.preventDefault();
    if (!selectedEntrega || fotosSubir.length === 0) return;
    setErrorMsg('');
    try {
      const fData = new FormData();
      Array.from(fotosSubir).forEach(f => fData.append('fotos', f));
      await axiosClient.post(`/entregas/${selectedEntrega.id_entrega}/evidencias`, fData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccessMsg('Evidencias fotográficas añadidas exitosamente');
      setShowEvidenciaModal(false);
      setFotosSubir([]);
      cargarEntregas();
    } catch (err) {
      setErrorMsg(err.message || 'Error al subir fotos');
    }
  };

  return (
    <div>
      <PageHeader
        title="Control de Entregas y Comprobantes"
        subtitle="Módulo MVP 4: Confirmación en destino, evidencias fotográficas y comprobante digital en PDF"
        actions={
          <button 
            className="btn btn-primary"
            onClick={() => setTabActiva(tabActiva === 'confirmar' ? 'entregas' : 'confirmar')}
          >
            {tabActiva === 'confirmar' ? <CheckCircle size={16} /> : <Plus size={16} />}
            <span>{tabActiva === 'confirmar' ? 'Ver Historial' : 'Confirmar Entrega Móvil'}</span>
          </button>
        }
      />

      {/* Selector de Pestañas */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--c-slate-border)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setTabActiva('entregas')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.875rem',
            backgroundColor: tabActiva === 'entregas' ? '#0A0908' : 'transparent',
            color: tabActiva === 'entregas' ? '#FFFFFF' : 'var(--c-slate-dark)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FileText size={16} color={tabActiva === 'entregas' ? '#43C59E' : 'currentColor'} />
          <span>Historial de Entregas y Comprobantes</span>
        </button>

        <button
          onClick={() => setTabActiva('confirmar')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.875rem',
            backgroundColor: tabActiva === 'confirmar' ? '#0A0908' : 'transparent',
            color: tabActiva === 'confirmar' ? '#FFFFFF' : 'var(--c-slate-dark)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Camera size={16} color={tabActiva === 'confirmar' ? '#43C59E' : 'currentColor'} />
          <span>Formulario de Entrega en Destino (FE-ENT-01)</span>
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
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-danger)' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* PESTAÑA 1: HISTORIAL DE ENTREGAS Y COMPROBANTES (HU-ENT-05 / FE-ENT-02) */}
      {tabActiva === 'entregas' && (
        <>
          {/* Barra de Filtros */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                <input
                  type="text"
                  value={searchReceptor}
                  onChange={(e) => setSearchReceptor(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && cargarEntregas()}
                  placeholder="Buscar por nombre de receptor..."
                  style={{ width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.25rem', fontSize: '0.875rem' }}
                />
                <Search size={16} style={{ position: 'absolute', left: 10, top: 13, color: 'var(--c-slate)' }} />
              </div>

              <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                <input
                  type="text"
                  value={searchCodigo}
                  onChange={(e) => setSearchCodigo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && cargarEntregas()}
                  placeholder="Buscar por código de envío (TLA-...)..."
                  style={{ width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.25rem', fontSize: '0.875rem' }}
                />
                <Search size={16} style={{ position: 'absolute', left: 10, top: 13, color: 'var(--c-slate)' }} />
              </div>

              <button className="btn btn-outline" onClick={cargarEntregas}>
                <RefreshCw size={14} color="var(--c-slate-dark)" />
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          {/* Tabla de Entregas */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Envío</th>
                    <th>Receptor Confirmado</th>
                    <th>Fecha y Hora</th>
                    <th>Comprobante Digital</th>
                    <th>Evidencias</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--c-text-muted)' }}>
                        Cargando entregas...
                      </td>
                    </tr>
                  ) : entregas.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                        <CheckCircle size={40} color="var(--c-slate)" style={{ marginBottom: '0.5rem' }} />
                        <div style={{ fontWeight: 700, color: 'var(--c-dark)' }}>No hay entregas registradas</div>
                        <div style={{ fontSize: '0.825rem', color: 'var(--c-text-secondary)', marginTop: '0.25rem' }}>
                          Use la pestaña "Confirmar Entrega Móvil" para registrar la recepción de un envío.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    entregas.map((e) => (
                      <tr key={e.id_entrega}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0A0908' }}>
                            {e.codigo_seguimiento || `Envío #${e.id_envio}`}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--c-slate-dark)' }}>
                            {e.origen_ciudad} → {e.destino_ciudad}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--c-dark)' }}>{e.nombre_receptor}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)' }}>Doc: {e.documento_receptor || 'N/A'}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.825rem' }}>
                            {new Date(e.fecha_hora_entrega).toLocaleString()}
                          </div>
                        </td>
                        <td>
                          {e.nro_comprobante ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontWeight: 700, color: 'var(--c-mint-dark)', fontSize: '0.8rem' }}>
                                {e.nro_comprobante}
                              </span>
                            </div>
                          ) : (
                            <span className="badge badge-slate">Sin comprobante</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem', color: 'var(--c-slate-dark)' }}>
                            <Camera size={14} color="var(--c-mint-dark)" />
                            <span>{e.total_evidencias || e.evidencias?.length || 0} foto(s)</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem' }}>
                            <button
                              onClick={() => verDetalleEntrega(e)}
                              className="btn btn-outline"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                              title="Ver detalle de entrega"
                            >
                              <span>Detalle</span>
                            </button>
                            <button
                              onClick={() => handleDescargarComprobante(e.id_entrega)}
                              className="btn btn-dark"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                              title="Descargar comprobante en PDF"
                            >
                              <Download size={13} color="var(--c-mint)" />
                              <span>PDF</span>
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

      {/* PESTAÑA 2: FORMULARIO CONFIRMAR ENTREGA (HU-ENT-01 / FE-ENT-01) */}
      {tabActiva === 'confirmar' && (
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--c-slate-border)', paddingBottom: '0.75rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--c-mint-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={20} color="var(--c-mint-dark)" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--c-dark)' }}>
                  Confirmar Entrega en Destino (HU-ENT-01)
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--c-text-secondary)' }}>
                  Saga INT-02: Actualiza envío a ENTREGADO, libera vehículo/conductor y genera comprobante PDF
                </div>
              </div>
            </div>

            <form onSubmit={handleConfirmarEntrega}>
              {/* Selección de Envío */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-dark)', display: 'block', marginBottom: '0.35rem' }}>
                  1. Envío en Tránsito:
                </label>
                {enviosEnTransito.length === 0 ? (
                  <div style={{ padding: '0.85rem', borderRadius: 6, backgroundColor: 'var(--c-warning-bg)', border: '1px solid var(--c-warning-border)', fontSize: '0.825rem', color: 'var(--c-warning)' }}>
                    No hay envíos en estado EN_TRANSITO actualmente. Asegúrese de realizar primero la asignación y salida de ruta.
                  </div>
                ) : (
                  <select
                    required
                    value={formData.codigoEnvio}
                    onChange={(e) => setFormData({ ...formData, codigoEnvio: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', fontSize: '0.875rem' }}
                  >
                    {enviosEnTransito.map(e => (
                      <option key={e.id_envio} value={e.codigo_seguimiento}>
                        {e.codigo_seguimiento} — {e.origen_ciudad} → {e.destino_ciudad} (Destinatario: {e.destinatario_nombre})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Datos del Receptor */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--c-slate-dark)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  2. Datos de Recepción
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--c-text-secondary)', display: 'block', marginBottom: 2 }}>Nombre Completo del Receptor</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre y Apellidos"
                      value={formData.nombreReceptor}
                      onChange={(e) => setFormData({ ...formData, nombreReceptor: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--c-text-secondary)', display: 'block', marginBottom: 2 }}>CI / Documento</label>
                    <input
                      type="text"
                      placeholder="Nro. Documento"
                      value={formData.documentoReceptor}
                      onChange={(e) => setFormData({ ...formData, documentoReceptor: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--c-text-secondary)', display: 'block', marginBottom: 2 }}>Fecha y Hora Real de Entrega</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.fechaHoraEntrega}
                      onChange={(e) => setFormData({ ...formData, fechaHoraEntrega: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Evidencia Fotográfica (HU-ENT-02) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--c-slate-dark)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  3. Evidencias Fotográficas (1 a 5 fotos)
                </h4>
                <div style={{ border: '2px dashed var(--c-slate-border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', textAlign: 'center', backgroundColor: '#FAFCFE' }}>
                  <Camera size={32} color="var(--c-slate)" style={{ marginBottom: '0.35rem' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-dark)' }}>
                    Adjuntar fotos del paquete entregado / firma de conformidad
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setArchivosEvidencia(e.target.files)}
                    style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}
                  />
                  {archivosEvidencia.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--c-mint-dark)', fontWeight: 600, marginTop: '0.5rem' }}>
                      {archivosEvidencia.length} archivo(s) seleccionado(s)
                    </div>
                  )}
                </div>
              </div>

              {/* Observaciones */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--c-dark)', display: 'block', marginBottom: 2 }}>
                  Observaciones de Entrega:
                </label>
                <textarea
                  rows="2"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setTabActiva('entregas')} className="btn btn-outline">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={enviosEnTransito.length === 0}
                  className="btn btn-primary"
                >
                  Confirmar Entrega y Emitir Comprobante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE ENTREGA */}
      {showDetalleModal && selectedEntrega && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--c-slate-border)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--c-dark)' }}>
                  Entrega #{selectedEntrega.id_entrega}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)' }}>
                  Envío: <strong>{selectedEntrega.codigo_seguimiento || `ID ${selectedEntrega.id_envio}`}</strong>
                </div>
              </div>
              <button onClick={() => setShowDetalleModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-slate)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ backgroundColor: 'var(--c-slate-light)', padding: '0.85rem', borderRadius: 6 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--c-slate-dark)', textTransform: 'uppercase' }}>Receptor</div>
                <div style={{ fontWeight: 700, color: 'var(--c-dark)', marginTop: 2 }}>{selectedEntrega.nombre_receptor}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--c-text-secondary)', marginTop: 2 }}>Doc: {selectedEntrega.documento_receptor || 'N/A'}</div>
              </div>
              <div style={{ backgroundColor: 'var(--c-slate-light)', padding: '0.85rem', borderRadius: 6 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--c-slate-dark)', textTransform: 'uppercase' }}>Fecha de Recepción</div>
                <div style={{ fontWeight: 700, color: 'var(--c-dark)', marginTop: 2 }}>{new Date(selectedEntrega.fecha_hora_entrega).toLocaleString()}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--c-text-secondary)', marginTop: 2 }}>{selectedEntrega.observaciones || 'Sin observaciones'}</div>
              </div>
            </div>

            {/* Evidencias fotográficas */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--c-slate-dark)', textTransform: 'uppercase' }}>
                  Evidencias Fotográficas Adjuntas
                </h4>
                <button 
                  onClick={() => setShowEvidenciaModal(true)}
                  className="btn btn-outline" 
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                >
                  <Upload size={12} />
                  <span>Subir Más Fotos</span>
                </button>
              </div>

              {selectedEntrega.evidencias && selectedEntrega.evidencias.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.75rem' }}>
                  {selectedEntrega.evidencias.map((ev, idx) => (
                    <div key={idx} style={{ border: '1px solid var(--c-slate-border)', borderRadius: 6, overflow: 'hidden', backgroundColor: '#F8FAFC' }}>
                      <img 
                        src={`http://localhost:3000${ev.url_archivo}`} 
                        alt="Evidencia" 
                        style={{ width: '100%', height: 80, objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div style={{ padding: '0.35rem', fontSize: '0.7rem', color: 'var(--c-text-muted)', textAlign: 'center' }}>
                        Foto #{idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '1rem', border: '1px dashed var(--c-slate-border)', borderRadius: 6, textAlign: 'center', fontSize: '0.8rem', color: 'var(--c-text-muted)' }}>
                  No se adjuntaron fotos al momento de la entrega.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--c-slate-border)', paddingTop: '1rem' }}>
              <button 
                onClick={() => handleDescargarComprobante(selectedEntrega.id_entrega)}
                className="btn btn-dark"
              >
                <Download size={14} color="var(--c-mint)" />
                <span>Descargar Comprobante PDF</span>
              </button>
              <button onClick={() => setShowDetalleModal(false)} className="btn btn-outline">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUBIR MÁS FOTOS */}
      {showEvidenciaModal && selectedEntrega && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--c-dark)', marginBottom: '0.5rem' }}>
              Subir Fotos de Evidencia
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--c-text-secondary)', marginBottom: '1rem' }}>
              Entrega #{selectedEntrega.id_entrega}
            </p>

            <form onSubmit={handleSubirFotosAdicionales}>
              <div style={{ marginBottom: '1.25rem' }}>
                <input
                  type="file"
                  multiple
                  required
                  accept="image/*"
                  onChange={(e) => setFotosSubir(e.target.files)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowEvidenciaModal(false)} className="btn btn-outline">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Subir Archivos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
