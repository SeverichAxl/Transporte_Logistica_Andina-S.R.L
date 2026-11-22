-- =====================================================================
-- Sistema Integral de Gestión Logística - Transporte y Logística Andina S.R.L.
-- ESQUEMA DEFINITIVO v2 (solo DDL). PostgreSQL 13+
-- Un esquema por microservicio (database-per-service).
-- Las referencias entre servicios (id_vehiculo, id_envio, id_conductor,
-- id_asignacion) son referencias LÓGICAS (sin FOREIGN KEY) para preservar
-- autonomía; se validan por API.
-- Importar en Vertabelo: Import > SQL > PostgreSQL.
-- Ejecutar después: 02_datos_reglas_y_automatizacion_v2.sql
-- =====================================================================

CREATE SCHEMA envios;
CREATE SCHEMA flota;
CREATE SCHEMA conductores;
CREATE SCHEMA entregas;

-- =====================================================================
-- MS-ENVIOS
-- =====================================================================
CREATE TABLE envios.estado_envio (
    id_estado SMALLINT NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(40) NOT NULL,
    CONSTRAINT estado_envio_pk PRIMARY KEY (id_estado),
    CONSTRAINT estado_envio_codigo_uq UNIQUE (codigo)
);

-- Máquina de estados: transiciones permitidas (HU-ENV-04)
CREATE TABLE envios.transicion_estado_envio (
    id_estado_origen SMALLINT NOT NULL,
    id_estado_destino SMALLINT NOT NULL,
    CONSTRAINT transicion_estado_envio_pk PRIMARY KEY (id_estado_origen, id_estado_destino),
    CONSTRAINT transicion_distinta_ck CHECK (id_estado_origen <> id_estado_destino)
);

-- Origen del cambio de estado (campo "origenEvento" de la API)
CREATE TABLE envios.origen_evento (
    id_origen SMALLINT NOT NULL,
    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(60) NOT NULL,
    CONSTRAINT origen_evento_pk PRIMARY KEY (id_origen),
    CONSTRAINT origen_evento_codigo_uq UNIQUE (codigo)
);

CREATE TABLE envios.contacto (
    id_contacto SERIAL NOT NULL,
    tipo_documento VARCHAR(10) NOT NULL,
    nro_documento VARCHAR(30) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NULL,
    email VARCHAR(120) NULL,
    direccion VARCHAR(250) NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contacto_pk PRIMARY KEY (id_contacto),
    CONSTRAINT contacto_documento_uq UNIQUE (tipo_documento, nro_documento)
);

-- La relación envío-conductor-vehículo vive SOLO en conductores.asignacion
-- (fuente única de verdad). Por eso envio no guarda id_vehiculo/id_conductor.
CREATE TABLE envios.envio (
    id_envio SERIAL NOT NULL,
    codigo_seguimiento VARCHAR(20) NOT NULL,  -- DEFAULT se asigna en el script 02 (secuencia)
    id_remitente INT NOT NULL,
    id_destinatario INT NOT NULL,
    origen_ciudad VARCHAR(80) NOT NULL,
    origen_direccion VARCHAR(250) NOT NULL,
    destino_ciudad VARCHAR(80) NOT NULL,
    destino_direccion VARCHAR(250) NOT NULL,
    descripcion_carga VARCHAR(250) NULL,
    peso_kg DECIMAL(10,2) NOT NULL,
    id_estado SMALLINT NOT NULL,
    fecha_registro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT envio_pk PRIMARY KEY (id_envio),
    CONSTRAINT envio_codigo_uq UNIQUE (codigo_seguimiento),
    CONSTRAINT envio_peso_ck CHECK (peso_kg > 0),
    CONSTRAINT envio_codigo_formato_ck CHECK (codigo_seguimiento ~ '^TLA-[0-9]{4}-[0-9]{6}$')
);

CREATE TABLE envios.historial_estado_envio (
    id_historial SERIAL NOT NULL,
    id_envio INT NOT NULL,
    id_estado_anterior SMALLINT NULL,
    id_estado_nuevo SMALLINT NOT NULL,
    fecha_cambio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario VARCHAR(80) NULL,
    id_origen SMALLINT NOT NULL DEFAULT 1,   -- 1 = MANUAL
    observacion VARCHAR(250) NULL,
    CONSTRAINT historial_estado_envio_pk PRIMARY KEY (id_historial),
    CONSTRAINT hist_estados_distintos_ck
        CHECK (id_estado_anterior IS NULL OR id_estado_anterior <> id_estado_nuevo),
    -- HU-ENV-05: motivo obligatorio al cancelar (id 5 = CANCELADO)
    CONSTRAINT hist_cancelacion_motivo_ck
        CHECK (id_estado_nuevo <> 5 OR (observacion IS NOT NULL AND btrim(observacion) <> ''))
);

ALTER TABLE envios.transicion_estado_envio ADD CONSTRAINT transicion_origen_fk
    FOREIGN KEY (id_estado_origen) REFERENCES envios.estado_envio (id_estado);
ALTER TABLE envios.transicion_estado_envio ADD CONSTRAINT transicion_destino_fk
    FOREIGN KEY (id_estado_destino) REFERENCES envios.estado_envio (id_estado);
ALTER TABLE envios.envio ADD CONSTRAINT envio_remitente_fk
    FOREIGN KEY (id_remitente) REFERENCES envios.contacto (id_contacto);
ALTER TABLE envios.envio ADD CONSTRAINT envio_destinatario_fk
    FOREIGN KEY (id_destinatario) REFERENCES envios.contacto (id_contacto);
ALTER TABLE envios.envio ADD CONSTRAINT envio_estado_fk
    FOREIGN KEY (id_estado) REFERENCES envios.estado_envio (id_estado);
ALTER TABLE envios.historial_estado_envio ADD CONSTRAINT hist_envio_fk
    FOREIGN KEY (id_envio) REFERENCES envios.envio (id_envio);
ALTER TABLE envios.historial_estado_envio ADD CONSTRAINT hist_estado_ant_fk
    FOREIGN KEY (id_estado_anterior) REFERENCES envios.estado_envio (id_estado);
ALTER TABLE envios.historial_estado_envio ADD CONSTRAINT hist_estado_nuevo_fk
    FOREIGN KEY (id_estado_nuevo) REFERENCES envios.estado_envio (id_estado);
ALTER TABLE envios.historial_estado_envio ADD CONSTRAINT hist_origen_fk
    FOREIGN KEY (id_origen) REFERENCES envios.origen_evento (id_origen);

CREATE INDEX envio_estado_idx          ON envios.envio (id_estado);
CREATE INDEX envio_fecha_registro_idx  ON envios.envio (fecha_registro);
CREATE INDEX envio_remitente_idx       ON envios.envio (id_remitente);
CREATE INDEX envio_destinatario_idx    ON envios.envio (id_destinatario);
CREATE INDEX envio_origen_ciudad_idx   ON envios.envio (origen_ciudad);
CREATE INDEX envio_destino_ciudad_idx  ON envios.envio (destino_ciudad);
CREATE INDEX hist_envio_fecha_idx      ON envios.historial_estado_envio (id_envio, fecha_cambio);

-- =====================================================================
-- MS-FLOTA
-- =====================================================================
CREATE TABLE flota.estado_vehiculo (
    id_estado SMALLINT NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(40) NOT NULL,
    CONSTRAINT estado_vehiculo_pk PRIMARY KEY (id_estado),
    CONSTRAINT estado_vehiculo_codigo_uq UNIQUE (codigo)
);

CREATE TABLE flota.vehiculo (
    id_vehiculo SERIAL NOT NULL,
    placa VARCHAR(15) NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    anio SMALLINT NOT NULL,
    capacidad_carga_kg DECIMAL(10,2) NOT NULL,
    -- Categoría de licencia exigida (código de conductores.categoria_licencia).
    -- Referencia lógica. Si es NULL, el servicio la deriva por capacidad.
    -- Soporta el error CATEGORIA_INSUFICIENTE de POST /asignaciones.
    categoria_licencia_requerida VARCHAR(5) NULL,
    id_estado SMALLINT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,  -- baja lógica
    fecha_baja TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT vehiculo_pk PRIMARY KEY (id_vehiculo),
    CONSTRAINT vehiculo_placa_uq UNIQUE (placa),
    CONSTRAINT vehiculo_anio_ck CHECK (anio BETWEEN 1980 AND 2100),
    CONSTRAINT vehiculo_capacidad_ck CHECK (capacidad_carga_kg > 0),
    CONSTRAINT vehiculo_baja_ck
        CHECK ((activo AND fecha_baja IS NULL) OR (NOT activo AND fecha_baja IS NOT NULL)),
    -- Un vehículo dado de baja debe quedar FUERA_SERVICIO (id 4)
    CONSTRAINT vehiculo_baja_estado_ck CHECK (activo OR id_estado = 4)
);

CREATE TABLE flota.historial_estado_vehiculo (
    id_historial SERIAL NOT NULL,
    id_vehiculo INT NOT NULL,
    id_estado_anterior SMALLINT NULL,
    id_estado_nuevo SMALLINT NOT NULL,
    fecha_cambio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivo VARCHAR(250) NULL,
    usuario VARCHAR(80) NULL,
    CONSTRAINT historial_estado_vehiculo_pk PRIMARY KEY (id_historial),
    CONSTRAINT hist_veh_estados_distintos_ck
        CHECK (id_estado_anterior IS NULL OR id_estado_anterior <> id_estado_nuevo)
);

ALTER TABLE flota.vehiculo ADD CONSTRAINT vehiculo_estado_fk
    FOREIGN KEY (id_estado) REFERENCES flota.estado_vehiculo (id_estado);
ALTER TABLE flota.historial_estado_vehiculo ADD CONSTRAINT hist_veh_vehiculo_fk
    FOREIGN KEY (id_vehiculo) REFERENCES flota.vehiculo (id_vehiculo);
ALTER TABLE flota.historial_estado_vehiculo ADD CONSTRAINT hist_veh_ant_fk
    FOREIGN KEY (id_estado_anterior) REFERENCES flota.estado_vehiculo (id_estado);
ALTER TABLE flota.historial_estado_vehiculo ADD CONSTRAINT hist_veh_nuevo_fk
    FOREIGN KEY (id_estado_nuevo) REFERENCES flota.estado_vehiculo (id_estado);

CREATE INDEX vehiculo_estado_idx     ON flota.vehiculo (id_estado);
CREATE INDEX hist_veh_fecha_idx      ON flota.historial_estado_vehiculo (id_vehiculo, fecha_cambio);

-- =====================================================================
-- MS-CONDUCTORES
-- =====================================================================
CREATE TABLE conductores.estado_conductor (
    id_estado SMALLINT NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(40) NOT NULL,
    CONSTRAINT estado_conductor_pk PRIMARY KEY (id_estado),
    CONSTRAINT estado_conductor_codigo_uq UNIQUE (codigo)
);

CREATE TABLE conductores.categoria_licencia (
    id_categoria SMALLINT NOT NULL,
    codigo VARCHAR(5) NOT NULL,
    descripcion VARCHAR(100) NOT NULL,
    CONSTRAINT categoria_licencia_pk PRIMARY KEY (id_categoria),
    CONSTRAINT categoria_licencia_codigo_uq UNIQUE (codigo)
);

CREATE TABLE conductores.estado_asignacion (
    id_estado SMALLINT NOT NULL,
    codigo VARCHAR(15) NOT NULL,
    nombre VARCHAR(40) NOT NULL,
    CONSTRAINT estado_asignacion_pk PRIMARY KEY (id_estado),
    CONSTRAINT estado_asignacion_codigo_uq UNIQUE (codigo)
);

-- El estado del conductor (DISPONIBLE/OCUPADO/INACTIVO) manda; no hay flag "activo".
CREATE TABLE conductores.conductor (
    id_conductor SERIAL NOT NULL,
    tipo_documento VARCHAR(10) NOT NULL,
    nro_documento VARCHAR(30) NOT NULL,
    nombres VARCHAR(80) NOT NULL,
    apellidos VARCHAR(80) NOT NULL,
    fecha_nacimiento DATE NOT NULL,   -- mayoría de edad validada por trigger (script 02)
    telefono VARCHAR(20) NULL,
    email VARCHAR(120) NULL,
    direccion VARCHAR(250) NULL,
    id_estado SMALLINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT conductor_pk PRIMARY KEY (id_conductor),
    CONSTRAINT conductor_documento_uq UNIQUE (tipo_documento, nro_documento)
);

-- La vigencia NO se almacena: se calcula con fecha_vencimiento >= CURRENT_DATE.
-- es_principal = licencia en uso (solo una por conductor, ver script 02).
CREATE TABLE conductores.licencia (
    id_licencia SERIAL NOT NULL,
    id_conductor INT NOT NULL,
    nro_licencia VARCHAR(30) NOT NULL,
    id_categoria SMALLINT NOT NULL,
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    es_principal BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT licencia_pk PRIMARY KEY (id_licencia),
    CONSTRAINT licencia_nro_uq UNIQUE (nro_licencia),
    CONSTRAINT licencia_fechas_ck CHECK (fecha_vencimiento > fecha_emision)
);

-- FUENTE DE VERDAD de la relación envío-conductor-vehículo.
CREATE TABLE conductores.asignacion (
    id_asignacion SERIAL NOT NULL,
    id_conductor INT NOT NULL,
    id_vehiculo INT NOT NULL,  -- referencia lógica a flota.vehiculo
    id_envio INT NOT NULL,     -- referencia lógica a envios.envio
    id_estado SMALLINT NOT NULL DEFAULT 1,   -- 1 = ACTIVA
    fecha_asignacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMP WITH TIME ZONE NULL,
    observacion VARCHAR(250) NULL,
    CONSTRAINT asignacion_pk PRIMARY KEY (id_asignacion),
    -- ACTIVA no tiene fecha_fin; FINALIZADA/CANCELADA sí
    CONSTRAINT asignacion_fecha_fin_ck
        CHECK ((id_estado = 1 AND fecha_fin IS NULL) OR (id_estado <> 1 AND fecha_fin IS NOT NULL))
);

ALTER TABLE conductores.conductor ADD CONSTRAINT conductor_estado_fk
    FOREIGN KEY (id_estado) REFERENCES conductores.estado_conductor (id_estado);
ALTER TABLE conductores.licencia ADD CONSTRAINT licencia_conductor_fk
    FOREIGN KEY (id_conductor) REFERENCES conductores.conductor (id_conductor);
ALTER TABLE conductores.licencia ADD CONSTRAINT licencia_categoria_fk
    FOREIGN KEY (id_categoria) REFERENCES conductores.categoria_licencia (id_categoria);
ALTER TABLE conductores.asignacion ADD CONSTRAINT asignacion_conductor_fk
    FOREIGN KEY (id_conductor) REFERENCES conductores.conductor (id_conductor);
ALTER TABLE conductores.asignacion ADD CONSTRAINT asignacion_estado_fk
    FOREIGN KEY (id_estado) REFERENCES conductores.estado_asignacion (id_estado);

CREATE INDEX conductor_estado_idx            ON conductores.conductor (id_estado);
CREATE INDEX licencia_conductor_idx          ON conductores.licencia (id_conductor);
CREATE INDEX licencia_vencimiento_idx        ON conductores.licencia (fecha_vencimiento);
CREATE INDEX asignacion_conductor_estado_idx ON conductores.asignacion (id_conductor, id_estado);
CREATE INDEX asignacion_envio_idx            ON conductores.asignacion (id_envio);
CREATE INDEX asignacion_vehiculo_idx         ON conductores.asignacion (id_vehiculo);

-- =====================================================================
-- MS-ENTREGAS
-- =====================================================================
CREATE TABLE entregas.entrega (
    id_entrega SERIAL NOT NULL,
    id_envio INT NOT NULL,         -- referencia lógica a envios.envio
    -- Snapshots históricos de quién entregó realmente (referencias lógicas):
    id_asignacion INT NULL,        -- a conductores.asignacion (necesario para PATCH .../finalizar)
    id_conductor INT NULL,         -- a conductores.conductor
    id_vehiculo INT NULL,          -- a flota.vehiculo
    nombre_receptor VARCHAR(150) NOT NULL,
    documento_receptor VARCHAR(30) NULL,
    fecha_hora_entrega TIMESTAMP WITH TIME ZONE NOT NULL,  -- "no futura" se valida en el servicio
    observaciones VARCHAR(250) NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT entrega_pk PRIMARY KEY (id_entrega),
    CONSTRAINT entrega_envio_uq UNIQUE (id_envio)  -- una confirmación por envío
);

CREATE TABLE entregas.evidencia_foto (
    id_evidencia SERIAL NOT NULL,
    id_entrega INT NOT NULL,
    nombre_archivo VARCHAR(150) NOT NULL,
    url_archivo VARCHAR(400) NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    tamano_bytes INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT evidencia_foto_pk PRIMARY KEY (id_evidencia),
    -- HU-ENT-02: JPG/PNG, máx. 5 MB (el máximo de 5 fotos se valida por trigger, script 02)
    CONSTRAINT evidencia_mime_ck CHECK (mime_type IN ('image/jpeg', 'image/png')),
    CONSTRAINT evidencia_tamano_ck CHECK (tamano_bytes > 0 AND tamano_bytes <= 5242880)
);

CREATE TABLE entregas.comprobante (
    id_comprobante SERIAL NOT NULL,
    id_entrega INT NOT NULL,
    nro_comprobante VARCHAR(30) NOT NULL,  -- DEFAULT por secuencia en script 02: COMP-2026-000077
    url_pdf VARCHAR(400) NULL,
    hash_documento VARCHAR(128) NULL,
    fecha_emision TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT comprobante_pk PRIMARY KEY (id_comprobante),
    CONSTRAINT comprobante_nro_uq UNIQUE (nro_comprobante),
    CONSTRAINT comprobante_entrega_uq UNIQUE (id_entrega)
);

ALTER TABLE entregas.evidencia_foto ADD CONSTRAINT evidencia_entrega_fk
    FOREIGN KEY (id_entrega) REFERENCES entregas.entrega (id_entrega);
ALTER TABLE entregas.comprobante ADD CONSTRAINT comprobante_entrega_fk
    FOREIGN KEY (id_entrega) REFERENCES entregas.entrega (id_entrega);

CREATE INDEX entrega_fecha_idx      ON entregas.entrega (fecha_hora_entrega);
CREATE INDEX entrega_conductor_idx  ON entregas.entrega (id_conductor);
CREATE INDEX evidencia_entrega_idx  ON entregas.evidencia_foto (id_entrega);
