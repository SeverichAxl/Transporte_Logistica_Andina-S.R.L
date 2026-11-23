const pool = require('../config/db');

class EntregaRepository {
  /**
   * Consulta de entregas con filtros (HU-ENT-05).
   * Filtros: fechaDesde/fechaHasta (fecha_hora_entrega), idConductor,
   * receptor (ILIKE), idEnvio (resuelto desde codigoSeguimiento en el servicio).
   */
  async findAll({ limit = 10, offset = 0, fechaDesde, fechaHasta, idConductor, receptor, idEnvio } = {}) {
    const { where, params, idx } = this._filtros({ fechaDesde, fechaHasta, idConductor, receptor, idEnvio });

    const query = `
      SELECT
        e.id_entrega,
        e.id_envio,
        e.id_asignacion,
        e.id_conductor,
        e.id_vehiculo,
        e.nombre_receptor,
        e.documento_receptor,
        e.fecha_hora_entrega,
        e.observaciones,
        e.created_at,
        c.id_comprobante,
        c.nro_comprobante,
        c.url_pdf AS comprobante_url,
        (SELECT COUNT(*)::int FROM entregas.evidencia_foto ev WHERE ev.id_entrega = e.id_entrega) AS total_evidencias
      FROM entregas.entrega e
      LEFT JOIN entregas.comprobante c ON e.id_entrega = c.id_entrega
      WHERE 1=1
      ${where}
      ORDER BY e.fecha_hora_entrega DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    return rows;
  }

  async countAll(filtros = {}) {
    const { where, params } = this._filtros(filtros);
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM entregas.entrega e WHERE 1=1 ${where}`,
      params
    );
    return rows[0]?.total || 0;
  }

  _filtros({ fechaDesde, fechaHasta, idConductor, receptor, idEnvio } = {}) {
    let where = '';
    const params = [];
    let idx = 1;

    if (fechaDesde) {
      where += ` AND e.fecha_hora_entrega >= $${idx++}`;
      params.push(fechaDesde);
    }
    if (fechaHasta) {
      where += ` AND e.fecha_hora_entrega <= $${idx++}`;
      params.push(fechaHasta);
    }
    if (idConductor) {
      where += ` AND e.id_conductor = $${idx++}`;
      params.push(idConductor);
    }
    if (receptor) {
      where += ` AND e.nombre_receptor ILIKE $${idx++}`;
      params.push(`%${receptor}%`);
    }
    if (idEnvio) {
      where += ` AND e.id_envio = $${idx++}`;
      params.push(idEnvio);
    }

    return { where, params, idx };
  }

  async findById(id) {
    const query = `
      SELECT
        e.*,
        c.id_comprobante,
        c.nro_comprobante,
        c.url_pdf AS comprobante_url,
        c.hash_documento AS comprobante_hash,
        c.fecha_emision AS comprobante_fecha_emision
      FROM entregas.entrega e
      LEFT JOIN entregas.comprobante c ON e.id_entrega = c.id_entrega
      WHERE e.id_entrega = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /** Una confirmación por envío (UNIQUE entrega_envio_uq) */
  async findByEnvio(idEnvio) {
    const { rows } = await pool.query(
      `SELECT id_entrega FROM entregas.entrega WHERE id_envio = $1`,
      [idEnvio]
    );
    return rows[0] || null;
  }

  /**
   * Registra la entrega con el snapshot de asignación/conductor/vehículo (HU-ENT-01).
   * El estado del envío se actualiza por saga (INT-02), no aquí.
   */
  async crear({
    idEnvio,
    idAsignacion = null,
    idConductor = null,
    idVehiculo = null,
    nombreReceptor,
    documentoReceptor = null,
    fechaHoraEntrega,
    observaciones = null
  }) {
    const { rows } = await pool.query(
      `INSERT INTO entregas.entrega
         (id_envio, id_asignacion, id_conductor, id_vehiculo,
          nombre_receptor, documento_receptor, fecha_hora_entrega, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        idEnvio,
        idAsignacion,
        idConductor,
        idVehiculo,
        nombreReceptor,
        documentoReceptor,
        fechaHoraEntrega,
        observaciones
      ]
    );
    return rows[0];
  }

  /** Compensación de la saga INT-02: se elimina la entrega si el envío no pudo pasar a ENTREGADO */
  async eliminar(idEntrega) {
    await pool.query(`DELETE FROM entregas.entrega WHERE id_entrega = $1`, [idEntrega]);
  }

  // ------------------------------------------------------------------
  // Evidencias (HU-ENT-02)
  // ------------------------------------------------------------------
  async contarEvidencias(idEntrega) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM entregas.evidencia_foto WHERE id_entrega = $1`,
      [idEntrega]
    );
    return rows[0]?.total || 0;
  }

  async listarEvidencias(idEntrega) {
    const { rows } = await pool.query(
      `SELECT id_evidencia, nombre_archivo, url_archivo, mime_type, tamano_bytes, created_at
         FROM entregas.evidencia_foto
        WHERE id_entrega = $1
        ORDER BY id_evidencia`,
      [idEntrega]
    );
    return rows;
  }

  async insertarEvidencia(idEntrega, { nombreArchivo, urlArchivo, mimeType, tamanoBytes }) {
    const { rows } = await pool.query(
      `INSERT INTO entregas.evidencia_foto (id_entrega, nombre_archivo, url_archivo, mime_type, tamano_bytes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_evidencia, nombre_archivo, url_archivo, mime_type, tamano_bytes, created_at`,
      [idEntrega, nombreArchivo, urlArchivo, mimeType, tamanoBytes]
    );
    return rows[0];
  }

  /** Borra evidencias insertadas en una transacción fallida (rollback lógico) */
  async eliminarEvidencias(idEntrega, idsEvidencias) {
    if (!idsEvidencias.length) return;
    await pool.query(
      `DELETE FROM entregas.evidencia_foto WHERE id_entrega = $1 AND id_evidencia = ANY($2::int[])`,
      [idEntrega, idsEvidencias]
    );
  }

  // ------------------------------------------------------------------
  // Comprobantes (HU-ENT-03)
  // ------------------------------------------------------------------
  async findComprobante(idEntrega) {
    const { rows } = await pool.query(
      `SELECT id_comprobante, id_entrega, nro_comprobante, url_pdf, hash_documento, fecha_emision
         FROM entregas.comprobante WHERE id_entrega = $1`,
      [idEntrega]
    );
    return rows[0] || null;
  }

  /**
   * Crea el comprobante con el número de la secuencia (DEFAULT en BD)
   * y actualiza url/hash tras generar el PDF.
   */
  async crearComprobante(idEntrega) {
    const { rows } = await pool.query(
      `INSERT INTO entregas.comprobante (id_entrega) VALUES ($1)
       RETURNING id_comprobante, nro_comprobante, fecha_emision`,
      [idEntrega]
    );
    return rows[0];
  }

  async actualizarComprobante(idComprobante, { urlPdf, hashDocumento }) {
    const { rows } = await pool.query(
      `UPDATE entregas.comprobante
          SET url_pdf = $2, hash_documento = $3
        WHERE id_comprobante = $1
        RETURNING id_comprobante, id_entrega, nro_comprobante, url_pdf, hash_documento, fecha_emision`,
      [idComprobante, urlPdf, hashDocumento]
    );
    return rows[0] || null;
  }

  // ------------------------------------------------------------------
  // Resumen (DAS-00) y outbox (INT-02)
  // ------------------------------------------------------------------
  async entregasPorDia() {
    const { rows } = await pool.query(`SELECT dia, total::int FROM entregas.v_entregas_por_dia`);
    return rows;
  }

  async contarTotal() {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS total FROM entregas.entrega`);
    return rows[0]?.total || 0;
  }

  /** Evento para reproceso cuando la liberación de recursos no pudo completarse (INT-02) */
  async guardarOutbox({ tipoEvento, agregado, idAgregado, payload }) {
    const { rows } = await pool.query(
      `INSERT INTO entregas.outbox_evento (tipo_evento, agregado, id_agregado, payload)
       VALUES ($1, $2, $3, $4)
       RETURNING id_evento`,
      [tipoEvento, agregado, idAgregado, JSON.stringify(payload)]
    );
    return rows[0].id_evento;
  }
}

module.exports = new EntregaRepository();
