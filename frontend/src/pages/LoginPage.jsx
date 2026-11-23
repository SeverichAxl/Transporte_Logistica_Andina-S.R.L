import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { 
  Truck, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, loginWithUser, isAuthenticated, availableUsers, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('operador');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirigir al dashboard si ya tiene sesión activa
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await login(identifier, password);
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (targetUser) => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await loginWithUser(targetUser);
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Error al iniciar sesión rápida.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      backgroundColor: '#0A0908'
    }}>
      {/* Panel Izquierdo: Branding Corporativo (#0A0908) */}
      <div style={{
        flex: 1,
        backgroundColor: '#0A0908',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '3.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#FFFFFF',
        position: 'relative'
      }} className="login-hero-panel">
        <div>
          {/* Logo y Encabezado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '2.5rem' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              backgroundColor: '#43C59E',
              color: '#0A0908',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(67, 197, 158, 0.3)'
            }}>
              <Truck size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.04em', lineHeight: 1.1 }}>
                LOGÍSTICA ANDINA
              </h1>
              <p style={{ fontSize: '0.75rem', color: '#6A8EAE', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                S.R.L. • Plataforma Integral
              </p>
            </div>
          </div>

          <div style={{ maxWidth: 460 }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.02em', marginBottom: '1rem', color: '#FFFFFF' }}>
              Gestión Centralizada de Operaciones y Flota Nacional
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '2rem' }}>
              Sistema integral con arquitectura basada en microservicios, persistencia relacional aislada por esquema y control de acceso seguro por roles.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 28, height: 28, borderRadius: '6px', backgroundColor: 'rgba(67, 197, 158, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={16} color="#43C59E" />
                </div>
                <div style={{ fontSize: '0.875rem', color: '#CBD5E1' }}>
                  Autenticación con <strong>Tokens JWT</strong> y contraseñas hasheadas en <strong>bcrypt</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 28, height: 28, borderRadius: '6px', backgroundColor: 'rgba(106, 142, 174, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={16} color="#6A8EAE" />
                </div>
                <div style={{ fontSize: '0.875rem', color: '#CBD5E1' }}>
                  Auditoría completa con propagación de usuario y <strong>X-Correlation-Id</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer del panel lateral */}
        <div style={{ fontSize: '0.75rem', color: '#6A8EAE', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem' }}>
          <div>© 2026 Transporte y Logística Andina S.R.L.</div>
          <div style={{ marginTop: '0.25rem' }}>Kata Arquitectónico • Microservicios Node.js + Express + React</div>
        </div>
      </div>

      {/* Panel Derecho: Formulario de Login (#FFFFFF) */}
      <div style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem'
      }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0A0908', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
              Iniciar Sesión
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#4A5568' }}>
              Ingrese sus credenciales corporativas para acceder al sistema.
            </p>
          </div>

          {/* Mensaje de Error */}
          {errorMsg && (
            <div style={{
              backgroundColor: '#FFF5F5',
              border: '1px solid #FEB2B2',
              color: '#C53030',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0A0908', display: 'block', marginBottom: '0.4rem' }}>
                Usuario o Correo Corporativo
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ej: operador o operador@logistica.andina"
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem 0.7rem 2.4rem',
                    fontSize: '0.9rem',
                    border: '1px solid #d2dee9',
                    borderRadius: '8px',
                    color: '#0A0908',
                    backgroundColor: '#FFFFFF'
                  }}
                />
                <User size={16} style={{ position: 'absolute', left: 12, top: 14, color: '#6A8EAE' }} />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0A0908' }}>
                  Contraseña
                </label>
                <span style={{ fontSize: '0.725rem', color: '#6A8EAE' }}>
                  Por defecto: Password123!
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese su contraseña"
                  style={{
                    width: '100%',
                    padding: '0.7rem 2.4rem 0.7rem 2.4rem',
                    fontSize: '0.9rem',
                    border: '1px solid #d2dee9',
                    borderRadius: '8px',
                    color: '#0A0908',
                    backgroundColor: '#FFFFFF'
                  }}
                />
                <Lock size={16} style={{ position: 'absolute', left: 12, top: 14, color: '#6A8EAE' }} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 13,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6A8EAE',
                    padding: 0
                  }}
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(67, 197, 158, 0.25)'
              }}
            >
              {isSubmitting || loading ? 'Verificando credenciales...' : 'Ingresar a la Plataforma'}
            </button>
          </form>

          {/* Separador */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '2rem 0 1.25rem 0',
            color: '#6A8EAE',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase'
          }}>
            <div style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
            <span style={{ padding: '0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Sparkles size={12} color="#43C59E" />
              <span>Acceso Rápido por Rol (Demostración)</span>
            </span>
            <div style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
          </div>

          {/* Accesos Rápidos para los 5 usuarios de las HU */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {availableUsers.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleQuickLogin(u)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.85rem',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e8f9f3';
                  e.currentTarget.style.borderColor = '#43C59E';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{
                    padding: '2px 7px',
                    borderRadius: 4,
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    backgroundColor: '#0A0908',
                    color: '#FFFFFF'
                  }}>
                    {u.rol}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#0A0908' }}>{u.nombre}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6A8EAE' }}>{u.rolNombre}</div>
                  </div>
                </div>
                <ArrowRight size={14} color="#6A8EAE" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
