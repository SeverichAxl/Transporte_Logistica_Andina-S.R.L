const pool = require('../config/db');

class EnvioRepository {
  /**
   * Busca o crea un contacto por (tipo_documento, nro_documento)
   */
  async upsertContacto(client, { tipoDocumento, nroDocumento, nombreCompleto, telefono, email, direccion }) {
    const findQuery = `
      SELECT id_contacto, tipo_documento, nro_documento, nombre_completo, telefono, email, direccion
      FROM envios.contacto
      WHERE tipo_documento = $1 AND nro_documento = $2
    `;
    const findRes = await client.query(findQuery, [tipoDocumento, nroDocumento]);
    if (findRes.rows.length > 0) {
      // Actualizar datos de contacto si cambiaron
      const updateQuery = `
        UPDATE envios.contacto
        SET nombre_completo = $1, telefono = COALESCE($2, telefono), email = COALESCE($3, email), direccion = COALESCE($4, direccion)
        WHERE id_contacto = $5
        RETURNING id_contacto, tipo_documento, nro_documento, nombre_completo, telefono, email, direccion
      `;
      const updateRes = await client.query(updateQuery, [
        nombreCompleto, telefono, email, direccion, findRes.rows[0].id_contacto
      ]);
      return updateRes.rows[0];
    }

    const insertQuery = `
      INSERT INTO envios.contacto (tipo_documento, nro_documento, nombre_completo, telefono, email, direccion)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_contacto, tipo_documento, nro_documento, nombre_completo, telefono, email, direccion
    `;
    const insertRes = await client.query(insertQuery, [
      tipoDocumento, nroDocumento, nombreCompleto, telefono, email, direccion
    ]);
    return insertRes.rows[0];
  }

  /**
   * Registra un nuevo envío (HU-ENV-01) en transacción
   */
  async createEnvio({
    remitente,
    destinatario,
    origenCiudad,
    origenDireccion,
    destinoCiudad,
    destinoDireccion,
    descripcionCarga,
    pesoKg,
    usuario = 'operador'
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Obtener o crear remitente y destinatario
      const rem = await this.upsertContacto(client, remitente);
      const dest = await this.upsertContacto(client, destinatario);

      // 2. Insertar el envío con estado inicial REGISTRADO (id 1)
      const insertEnvioQuery = `
        INSERT INTO envios.envio (
          id_remitente, id_destinatario,
          origen_ciudad, origen_direccion,
          destino_ciudad, destino_direccion,
          descripcion_carga, peso_kg, id_estado
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
        RETURNING *
      `;
      const envioRes = await client.query(insertEnvioQuery, [
        rem.id_contacto, dest.id_contacto,
        origenCiudad, origenDireccion,
        destinoCiudad, destinoDireccion,
        descripcionCarga, pesoKg
      ]);
      const nuevoEnvio = envioRes.rows[0];

      // 3. Registrar en historial de estados
      const insertHistorialQuery = `
        INSERT INTO envios.historial_estado_envio (
          id_envio, id_estado_anterior, id_estado_nuevo, usuario, id_origen, observacion
        )
        VALUES ($1, NULL, 1, $2, 1, 'Registro inicial del envío')
      `;
      await client.query(insertHistorialQuery, [nuevoEnvio.id_envio, usuario]);

      await client.query('COMMIT');

      return this.findById(nuevoEnvio.id_envio);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Consulta paginada con filtros combinables (HU-ENV-03)
   */
  async findAll({ limit = 10, offset = 0, estado, codigo, ciudad, fechaDesde, fechaHasta }) {
    let query = `
      SELECT 
        e.id_envio,
        e.codigo_seguimiento,
        e.id_remitente,
        r.nombre_completo AS remitente_nombre,
        r.tipo_documento AS remitente_tipo_doc,
        r.nro_documento AS remitente_nro_doc,
        r.telefono AS remitente_telefono,
        e.id_destinatario,
        d.nombre_completo AS destinatario_nombre,
        d.tipo_documento AS destinatario_tipo_doc,
        d.nro_documento AS destinatario_nro_doc,
        d.telefono AS destinatario_telefono,
        e.origen_ciudad,
        e.origen_direccion,
        e.destino_ciudad,
        e.destino_direccion,
        e.descripcion_carga,
        e.peso_kg,
        e.id_estado,
        es.codigo AS estado_codigo,
        es.nombre AS estado_nombre,
        e.fecha_registro,
        e.fecha_actualizacion
      FROM envios.envio e
      LEFT JOIN envios.contacto r ON e.id_remitente = r.id_contacto
      LEFT JOIN envios.contacto d ON e.id_destinatario = d.id_contacto
      LEFT JOIN envios.estado_envio es ON e.id_estado = es.id_estado
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (estado) {
      query += ` AND (es.codigo = $${idx} OR es.id_estado::text = $${idx})`;
      params.push(estado.toUpperCase());
      idx++;
    }
    if (codigo) {
      query += ` AND e.codigo_seguimiento ILIKE $${idx}`;
      params.push(`%${codigo.trim()}%`);
      idx++;
    }
    if (ciudad) {
      query += ` AND (e.origen_ciudad ILIKE $${idx} OR e.destino_ciudad ILIKE $${idx})`;
      params.push(`%${ciudad.trim()}%`);
      idx++;
    }
    if (fechaDesde) {
      query += ` AND e.fecha_registro >= $${idx}`;
      params.push(fechaDesde);
      idx++;
    }
    if (fechaHasta) {
      query += ` AND e.fecha_registro <= $${idx}`;
      params.push(fechaHasta);
      idx++;
    }

    query += ` ORDER BY e.id_envio DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    return rows;
  }

  async countAll({ estado, codigo, ciudad, fechaDesde, fechaHasta }) {
    let query = `
      SELECT COUNT(*)::int AS total
      FROM envios.envio e
      LEFT JOIN envios.estado_envio es ON e.id_estado = es.id_estado
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (estado) {
      query += ` AND (es.codigo = $${idx} OR es.id_estado::text = $${idx})`;
      params.push(estado.toUpperCase());
      idx++;
    }
    if (codigo) {
      query += ` AND e.codigo_seguimiento ILIKE $${idx}`;
      params.push(`%${codigo.trim()}%`);
      idx++;
    }
    if (ciudad) {
      query += ` AND (e.origen_ciudad ILIKE $${idx} OR e.destino_ciudad ILIKE $${idx})`;
      params.push(`%${ciudad.trim()}%`);
      idx++;
    }
    if (fechaDesde) {
      query += ` AND e.fecha_registro >= $${idx}`;
      params.push(fechaDesde);
      idx++;
    }
    if (fechaHasta) {
      query += ` AND e.fecha_registro <= $${idx}`;
      params.push(fechaHasta);
      idx++;
    }

    const { rows } = await pool.query(query, params);
    return rows[0]?.total || 0;
  }

  async findById(id) {
    const query = `
      SELECT 
        e.*,
        r.nombre_completo AS remitente_nombre,
        r.tipo_documento AS remitente_tipo_doc,
        r.nro_documento AS remitente_nro_doc,
        r.telefono AS remitente_telefono,
        r.email AS remitente_email,
        d.nombre_completo AS destinatario_nombre,
        d.tipo_documento AS destinatario_tipo_doc,
        d.nro_documento AS destinatario_nro_doc,
        d.telefono AS destinatario_telefono,
        d.email AS destinatario_email,
        es.codigo AS estado_codigo,
        es.nombre AS estado_nombre
      FROM envios.envio e
      LEFT JOIN envios.contacto r ON e.id_remitente = r.id_contacto
      LEFT JOIN envios.contacto d ON e.id_destinatario = d.id_contacto
      LEFT JOIN envios.estado_envio es ON e.id_estado = es.id_estado
      WHERE e.id_envio = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  async findByCodigo(codigo) {
    const query = `
      SELECT 
        e.*,
        r.nombre_completo AS remitente_nombre,
        r.tipo_documento AS remitente_tipo_doc,
        r.nro_documento AS remitente_nro_doc,
        r.telefono AS remitente_telefono,
        d.nombre_completo AS destinatario_nombre,
        d.tipo_documento AS destinatario_tipo_doc,
        d.nro_documento AS destinatario_nro_doc,
        d.telefono AS destinatario_telefono,
        es.codigo AS estado_codigo,
        es.nombre AS estado_nombre
      FROM envios.envio e
      LEFT JOIN envios.contacto r ON e.id_remitente = r.id_contacto
      LEFT JOIN envios.contacto d ON e.id_destinatario = d.id_contacto
      LEFT JOIN envios.estado_envio es ON e.id_estado = es.id_estado
      WHERE e.codigo_seguimiento = $1
    `;
    const { rows } = await pool.query(query, [codigo]);
    return rows[0] || null;
  }

  async getHistorial(idEnvio) {
    const query = `
      SELECT 
        h.id_historial,
        h.id_envio,
        h.id_estado_anterior,
        ea.codigo AS estado_anterior_codigo,
        ea.nombre AS estado_anterior_nombre,
        h.id_estado_nuevo,
        en.codigo AS estado_nuevo_codigo,
        en.nombre AS estado_nuevo_nombre,
        h.fecha_cambio,
        h.usuario,
        h.id_origen,
        oe.nombre AS origen_evento,
        h.observacion
      FROM envios.historial_estado_envio h
      LEFT JOIN envios.estado_envio ea ON h.id_estado_anterior = ea.id_estado
      JOIN envios.estado_envio en ON h.id_estado_nuevo = en.id_estado
      LEFT JOIN envios.origen_evento oe ON h.id_origen = oe.id_origen
      WHERE h.id_envio = $1
      ORDER BY h.id_historial ASC
    `;
    const { rows } = await pool.query(query, [idEnvio]);
    return rows;
  }

  /**
   * Modificar datos del envío (HU-ENV-02)
   */
  async updateEnvio(id, { origenCiudad, origenDireccion, destinoCiudad, destinoDireccion, descripcionCarga, pesoKg }) {
    const query = `
      UPDATE envios.envio
      SET 
        origen_ciudad = COALESCE($1, origen_ciudad),
        origen_direccion = COALESCE($2, origen_direccion),
        destino_ciudad = COALESCE($3, destino_ciudad),
        destino_direccion = COALESCE($4, destino_direccion),
        descripcion_carga = COALESCE($5, descripcion_carga),
        peso_kg = COALESCE($6, peso_kg),
        fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id_envio = $7
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      origenCiudad, origenDireccion, destinoCiudad, destinoDireccion, descripcionCarga, pesoKg, id
    ]);
    return rows[0] || null;
  }

  /**
   * Cambiar estado de envío (HU-ENV-04)
   */
  async updateEstado(idEnvio, { idEstadoAnterior, idEstadoNuevo, usuario = 'operador', observacion = null, idOrigen = 1 }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Actualizar estado en envio
      const updateQuery = `
        UPDATE envios.envio
        SET id_estado = $1, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_envio = $2
        RETURNING *
      `;
      const resUpdate = await client.query(updateQuery, [idEstadoNuevo, idEnvio]);

      // Insertar en historial
      const insertHistorial = `
        INSERT INTO envios.historial_estado_envio (
          id_envio, id_estado_anterior, id_estado_nuevo, usuario, id_origen, observacion
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      await client.query(insertHistorial, [idEnvio, idEstadoAnterior, idEstadoNuevo, usuario, idOrigen, observacion]);

      await client.query('COMMIT');
      return resUpdate.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Verifica si la transición entre estados es válida según envios.transicion_estado_envio
   */
  async isTransicionValida(idEstadoOrigen, idEstadoDestino) {
    const query = `
      SELECT 1 FROM envios.transicion_estado_envio
      WHERE id_estado_origen = $1 AND id_estado_destino = $2
    `;
    const { rows } = await pool.query(query, [idEstadoOrigen, idEstadoDestino]);
    return rows.length > 0;
  }

  async getEstadoByCodigo(codigo) {
    const query = `SELECT id_estado, codigo, nombre FROM envios.estado_envio WHERE codigo = $1`;
    const { rows } = await pool.query(query, [codigo.toUpperCase()]);
    return rows[0] || null;
  }
}

module.exports = new EnvioRepository();
