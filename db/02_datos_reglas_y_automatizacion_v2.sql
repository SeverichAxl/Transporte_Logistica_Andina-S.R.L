-- =====================================================================
-- 02_datos_reglas_y_automatizacion_v2.sql
-- Ejecutar DESPUÉS de 01_schema_logistica_andina_v2.sql
-- (no es necesario para importar en Vertabelo).
-- Contiene: semillas, índices parciales, secuencias, triggers de reglas
-- de negocio, vistas para el dashboard, outbox e idempotencia.
-- IMPORTANTE: las reglas usan ids fijos de catálogo (ver sección 1).
-- =====================================================================
BEGIN;

-- =====================================================================
-- 1. CATÁLOGOS (los ids son parte del contrato: no cambiarlos)
-- =====================================================================
INSERT INTO envios.estado_envio (id_estado, codigo, nombre) VALUES
    (1, 'REGISTRADO',  'Registrado'),
    (2, 'PENDIENTE',   'Pendiente'),
    (3, 'EN_TRANSITO', 'En tránsito'),
    (4, 'ENTREGADO',   'Entregado'),
    (5, 'CANCELADO',   'Cancelado');

INSERT INTO envios.origen_evento (id_origen, codigo, nombre) VALUES
    (1, 'MANUAL',       'Cambio manual por un usuario'),
    (2, 'ASIGNACION',   'Evento de MS-Conductores al asignar'),
    (3, 'ENTREGA',      'Evento de MS-Entregas al confirmar'),
    (4, 'CANCELACION',  'Cancelación del envío'),
    (5, 'SISTEMA',      'Proceso automático');

-- Transiciones válidas (HU-ENV-04): cualquier estado previo a ENTREGADO puede cancelarse
INSERT INTO envios.transicion_estado_envio (id_estado_origen, id_estado_destino)
SELECT o.id_estado, d.id_estado
FROM (VALUES
    ('REGISTRADO',  'PENDIENTE'),
    ('PENDIENTE',   'EN_TRANSITO'),
    ('EN_TRANSITO', 'ENTREGADO'),
    ('REGISTRADO',  'CANCELADO'),
    ('PENDIENTE',   'CANCELADO'),
    ('EN_TRANSITO', 'CANCELADO')
) AS t(origen, destino)
JOIN envios.estado_envio o ON o.codigo = t.origen
JOIN envios.estado_envio d ON d.codigo = t.destino;

INSERT INTO flota.estado_vehiculo (id_estado, codigo, nombre) VALUES
    (1, 'DISPONIBLE',     'Disponible'),
    (2, 'EN_RUTA',        'En ruta'),
    (3, 'MANTENIMIENTO',  'Mantenimiento'),
    (4, 'FUERA_SERVICIO', 'Fuera de servicio');

INSERT INTO conductores.estado_conductor (id_estado, codigo, nombre) VALUES
    (1, 'DISPONIBLE', 'Disponible'),
    (2, 'OCUPADO',    'Ocupado'),
    (3, 'INACTIVO',   'Inactivo');

INSERT INTO conductores.categoria_licencia (id_categoria, codigo, descripcion) VALUES
    (1, 'A', 'Motocicletas'),
    (2, 'B', 'Vehículos livianos'),
    (3, 'C', 'Vehículos de carga pesada'),
    (4, 'P', 'Transporte público/profesional');

INSERT INTO conductores.estado_asignacion (id_estado, codigo, nombre) VALUES
    (1, 'ACTIVA',     'Activa'),
    (2, 'FINALIZADA', 'Finalizada'),
    (3, 'CANCELADA',  'Cancelada');

-- =====================================================================
-- 2. ÍNDICES ÚNICOS PARCIALES (reglas de negocio reforzadas en BD)
-- =====================================================================
-- Un conductor / vehículo / envío solo puede tener UNA asignación ACTIVA (id_estado = 1)
CREATE UNIQUE INDEX asignacion_conductor_activa_uq ON conductores.asignacion (id_conductor) WHERE id_estado = 1;
CREATE UNIQUE INDEX asignacion_vehiculo_activa_uq  ON conductores.asignacion (id_vehiculo)  WHERE id_estado = 1;
CREATE UNIQUE INDEX asignacion_envio_activa_uq     ON conductores.asignacion (id_envio)     WHERE id_estado = 1;

-- Una sola licencia principal por conductor.
-- Al renovar: primero UPDATE de la anterior (es_principal = FALSE), luego INSERT de la nueva,
-- ambos en la misma transacción.
CREATE UNIQUE INDEX licencia_principal_uq ON conductores.licencia (id_conductor) WHERE es_principal;

-- Consulta frecuente: vehículos asignables (HU-FLO-05)
CREATE INDEX vehiculo_disponible_idx ON flota.vehiculo (capacidad_carga_kg)
    WHERE activo AND id_estado = 1;

-- =====================================================================
-- 3. TRIGGERS DE AUDITORÍA (updated_at)
-- =====================================================================
CREATE FUNCTION envios.fn_set_updated_at() RETURNS trigger AS $$
BEGIN NEW.fecha_actualizacion := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE FUNCTION flota.fn_set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE FUNCTION conductores.fn_set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_envio_updated_at BEFORE UPDATE ON envios.envio
    FOR EACH ROW EXECUTE FUNCTION envios.fn_set_updated_at();
CREATE TRIGGER trg_vehiculo_updated_at BEFORE UPDATE ON flota.vehiculo
    FOR EACH ROW EXECUTE FUNCTION flota.fn_set_updated_at();
CREATE TRIGGER trg_conductor_updated_at BEFORE UPDATE ON conductores.conductor
    FOR EACH ROW EXECUTE FUNCTION conductores.fn_set_updated_at();

-- =====================================================================
-- 4. MS-ENVIOS: reglas de negocio
-- =====================================================================
-- 4.1 Código de seguimiento: TLA-2026-000123
CREATE SEQUENCE envios.seq_codigo_seguimiento START 1;

CREATE FUNCTION envios.generar_codigo_seguimiento() RETURNS VARCHAR AS $$
    SELECT 'TLA-' || to_char(now(), 'YYYY') || '-' ||
           lpad(nextval('envios.seq_codigo_seguimiento')::text, 6, '0');
$$ LANGUAGE sql;

ALTER TABLE envios.envio
    ALTER COLUMN codigo_seguimiento SET DEFAULT envios.generar_codigo_seguimiento();

-- 4.2 Solo transiciones de estado permitidas (HU-ENV-04). La API responde 422.
CREATE FUNCTION envios.fn_validar_transicion_envio() RETURNS trigger AS $$
BEGIN
    IF NEW.id_estado <> OLD.id_estado AND NOT EXISTS (
        SELECT 1 FROM envios.transicion_estado_envio
         WHERE id_estado_origen = OLD.id_estado AND id_estado_destino = NEW.id_estado
    ) THEN
        RAISE EXCEPTION 'Transición de estado no permitida: % -> % (envío %)',
            OLD.id_estado, NEW.id_estado, OLD.id_envio
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_envio_validar_transicion BEFORE UPDATE OF id_estado ON envios.envio
    FOR EACH ROW EXECUTE FUNCTION envios.fn_validar_transicion_envio();

-- 4.3 No editar datos si está EN_TRANSITO (3), ENTREGADO (4) o CANCELADO (5) (HU-ENV-02)
CREATE FUNCTION envios.fn_bloquear_edicion_envio() RETURNS trigger AS $$
BEGIN
    IF OLD.id_estado IN (3, 4, 5) AND (
        (NEW.id_remitente, NEW.id_destinatario, NEW.origen_ciudad, NEW.origen_direccion,
         NEW.destino_ciudad, NEW.destino_direccion, NEW.descripcion_carga, NEW.peso_kg)
        IS DISTINCT FROM
        (OLD.id_remitente, OLD.id_destinatario, OLD.origen_ciudad, OLD.origen_direccion,
         OLD.destino_ciudad, OLD.destino_direccion, OLD.descripcion_carga, OLD.peso_kg)
    ) THEN
        RAISE EXCEPTION 'No se pueden modificar los datos de un envío en estado %', OLD.id_estado
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_envio_bloquear_edicion BEFORE UPDATE ON envios.envio
    FOR EACH ROW EXECUTE FUNCTION envios.fn_bloquear_edicion_envio();

-- =====================================================================
-- 5. MS-CONDUCTORES: mayoría de edad (trigger: CURRENT_DATE no es válido en CHECK estable)
-- =====================================================================
CREATE FUNCTION conductores.fn_validar_mayor_edad() RETURNS trigger AS $$
BEGIN
    IF NEW.fecha_nacimiento > (CURRENT_DATE - INTERVAL '18 years') THEN
        RAISE EXCEPTION 'El conductor debe ser mayor de 18 años'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_conductor_mayor_edad BEFORE INSERT OR UPDATE OF fecha_nacimiento
    ON conductores.conductor
    FOR EACH ROW EXECUTE FUNCTION conductores.fn_validar_mayor_edad();

-- =====================================================================
-- 6. MS-ENTREGAS
-- =====================================================================
-- 6.1 Número de comprobante: COMP-2026-000077
CREATE SEQUENCE entregas.seq_comprobante START 1;

CREATE FUNCTION entregas.generar_nro_comprobante() RETURNS VARCHAR AS $$
    SELECT 'COMP-' || to_char(now(), 'YYYY') || '-' ||
           lpad(nextval('entregas.seq_comprobante')::text, 6, '0');
$$ LANGUAGE sql;

ALTER TABLE entregas.comprobante
    ALTER COLUMN nro_comprobante SET DEFAULT entregas.generar_nro_comprobante();

-- 6.2 Máximo 5 fotos por entrega (HU-ENT-02). Bloquea la fila padre para evitar carreras.
CREATE FUNCTION entregas.fn_limitar_evidencias() RETURNS trigger AS $$
BEGIN
    PERFORM 1 FROM entregas.entrega WHERE id_entrega = NEW.id_entrega FOR UPDATE;
    IF (SELECT count(*) FROM entregas.evidencia_foto WHERE id_entrega = NEW.id_entrega) >= 5 THEN
        RAISE EXCEPTION 'Una entrega admite como máximo 5 fotos de evidencia'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_evidencia_limite BEFORE INSERT ON entregas.evidencia_foto
    FOR EACH ROW EXECUTE FUNCTION entregas.fn_limitar_evidencias();

-- =====================================================================
-- 7. VISTAS PARA EL DASHBOARD (alimentan /resumen y /dashboard/kpis)
-- =====================================================================
CREATE VIEW envios.v_resumen_estado AS
SELECT s.codigo AS estado, COUNT(e.id_envio) AS total
  FROM envios.estado_envio s
  LEFT JOIN envios.envio e ON e.id_estado = s.id_estado
 GROUP BY s.id_estado, s.codigo
 ORDER BY s.id_estado;

CREATE VIEW flota.v_resumen_estado AS
SELECT s.codigo AS estado, COUNT(v.id_vehiculo) AS total
  FROM flota.estado_vehiculo s
  LEFT JOIN flota.vehiculo v ON v.id_estado = s.id_estado AND v.activo
 GROUP BY s.id_estado, s.codigo
 ORDER BY s.id_estado;

CREATE VIEW entregas.v_entregas_por_dia AS
SELECT (fecha_hora_entrega AT TIME ZONE 'America/La_Paz')::date AS dia,
       COUNT(*) AS total
  FROM entregas.entrega
 GROUP BY 1
 ORDER BY 1 DESC;

-- Alertas de licencias (HU-CON-03): solo la licencia principal de cada conductor
CREATE VIEW conductores.v_licencia_estado AS
SELECT l.id_licencia, l.id_conductor, l.nro_licencia, l.id_categoria,
       l.fecha_emision, l.fecha_vencimiento, l.es_principal,
       (l.fecha_vencimiento >= CURRENT_DATE)  AS vigente,
       (l.fecha_vencimiento - CURRENT_DATE)   AS dias_para_vencer
  FROM conductores.licencia l;

-- =====================================================================
-- 8. INTEGRACIÓN: OUTBOX (eventos confiables) E IDEMPOTENCIA
-- =====================================================================
DO $$
DECLARE s TEXT;
BEGIN
    FOREACH s IN ARRAY ARRAY['envios','flota','conductores','entregas'] LOOP
        EXECUTE format($f$
            CREATE TABLE %I.outbox_evento (
                id_evento    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                tipo_evento  VARCHAR(60) NOT NULL,   -- p. ej. ENTREGA_CONFIRMADA
                agregado     VARCHAR(40) NOT NULL,   -- p. ej. envio
                id_agregado  INT         NOT NULL,
                payload      JSONB       NOT NULL,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
                publicado_at TIMESTAMPTZ NULL
            )$f$, s);
        EXECUTE format(
            'CREATE INDEX outbox_pendientes_idx ON %I.outbox_evento (created_at) WHERE publicado_at IS NULL', s);
        EXECUTE format($f$
            CREATE TABLE %I.evento_procesado (
                servicio_origen  VARCHAR(30) NOT NULL,
                id_evento_origen BIGINT      NOT NULL,
                procesado_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
                PRIMARY KEY (servicio_origen, id_evento_origen)   -- consumidor idempotente
            )$f$, s);
    END LOOP;
END $$;

-- Idempotency-Key de POST /asignaciones y POST /entregas
CREATE TABLE conductores.idempotencia (
    clave        VARCHAR(80)  NOT NULL PRIMARY KEY,
    endpoint     VARCHAR(80)  NOT NULL,
    hash_request VARCHAR(64)  NOT NULL,
    status_http  SMALLINT     NULL,
    respuesta    JSONB        NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE TABLE entregas.idempotencia (
    clave        VARCHAR(80)  NOT NULL PRIMARY KEY,
    endpoint     VARCHAR(80)  NOT NULL,
    hash_request VARCHAR(64)  NOT NULL,
    status_http  SMALLINT     NULL,
    respuesta    JSONB        NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- =====================================================================
-- 9. DOCUMENTACIÓN EN EL MODELO
-- =====================================================================
COMMENT ON TABLE conductores.asignacion IS
    'FUENTE DE VERDAD de la relación envío-conductor-vehículo. Conductor OCUPADO <=> tiene asignación ACTIVA (el servicio los mantiene sincronizados). Capacidad (envio.peso_kg <= vehiculo.capacidad_carga_kg) y categoría de licencia se validan por API.';
COMMENT ON COLUMN entregas.entrega.id_asignacion IS 'Snapshot histórico. Permite a MS-Entregas llamar PATCH /asignaciones/{id}/finalizar.';
COMMENT ON COLUMN entregas.entrega.id_conductor  IS 'Snapshot histórico: quién entregó realmente.';
COMMENT ON COLUMN entregas.entrega.id_vehiculo   IS 'Snapshot histórico: vehículo con el que se entregó.';
COMMENT ON COLUMN conductores.licencia.es_principal IS 'Licencia en uso. Vigencia = fecha_vencimiento >= CURRENT_DATE (ver v_licencia_estado).';
COMMENT ON COLUMN flota.vehiculo.categoria_licencia_requerida IS 'Código de categoría exigida (referencia lógica). NULL = el servicio la deriva por capacidad.';
COMMENT ON COLUMN envios.historial_estado_envio.usuario IS 'Texto libre hasta implementar autenticación (HU-TRA-01).';

COMMIT;
