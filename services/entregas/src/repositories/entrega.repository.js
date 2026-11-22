const pool = require('../config/db');

class EntregaRepository {
  async findAll({ limit = 10, offset = 0, idEnvio }) {
    let query = `
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
        c.url_archivo AS comprobante_url
      FROM entregas.entrega e
      LEFT JOIN entregas.comprobante c ON e.id_entrega = c.id_entrega
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (idEnvio) {
      query += ` AND e.id_envio = $${idx++}`;
      params.push(idEnvio);
    }

    query += ` ORDER BY e.id_entrega DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    return rows;
  }

  async countAll({ idEnvio }) {
    let query = `SELECT COUNT(*)::int AS total FROM entregas.entrega e WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (idEnvio) {
      query += ` AND e.id_envio = $${idx++}`;
      params.push(idEnvio);
    }

    const { rows } = await pool.query(query, params);
    return rows[0]?.total || 0;
  }

  async findById(id) {
    const query = `
      SELECT 
        e.*,
        c.nro_comprobante,
        c.url_archivo AS comprobante_url
      FROM entregas.entrega e
      LEFT JOIN entregas.comprobante c ON e.id_entrega = c.id_entrega
      WHERE e.id_entrega = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }
}

module.exports = new EntregaRepository();
