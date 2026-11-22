const pool = require('../config/db');

class ConductorRepository {
  async findAll({ limit = 10, offset = 0, estado, documento }) {
    let query = `
      SELECT 
        c.id_conductor,
        c.tipo_documento,
        c.nro_documento,
        c.nombres,
        c.apellidos,
        CONCAT(c.nombres, ' ', c.apellidos) AS nombre_completo,
        c.fecha_nacimiento,
        c.telefono,
        c.email,
        c.id_estado,
        ec.codigo AS estado_codigo,
        ec.nombre AS estado_nombre,
        l.nro_licencia,
        l.id_categoria,
        cl.codigo AS categoria_licencia,
        l.fecha_vencimiento AS licencia_vencimiento,
        c.created_at
      FROM conductores.conductor c
      LEFT JOIN conductores.estado_conductor ec ON c.id_estado = ec.id_estado
      LEFT JOIN conductores.licencia l ON c.id_conductor = l.id_conductor AND l.es_vigente = TRUE
      LEFT JOIN conductores.categoria_licencia cl ON l.id_categoria = cl.id_categoria
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (estado) {
      query += ` AND ec.codigo = $${idx++}`;
      params.push(estado);
    }
    if (documento) {
      query += ` AND c.nro_documento ILIKE $${idx++}`;
      params.push(`%${documento}%`);
    }

    query += ` ORDER BY c.id_conductor DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    return rows;
  }

  async countAll({ estado, documento }) {
    let query = `
      SELECT COUNT(*)::int AS total
      FROM conductores.conductor c
      LEFT JOIN conductores.estado_conductor ec ON c.id_estado = ec.id_estado
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (estado) {
      query += ` AND ec.codigo = $${idx++}`;
      params.push(estado);
    }
    if (documento) {
      query += ` AND c.nro_documento ILIKE $${idx++}`;
      params.push(`%${documento}%`);
    }

    const { rows } = await pool.query(query, params);
    return rows[0]?.total || 0;
  }

  async findById(id) {
    const query = `
      SELECT 
        c.*,
        CONCAT(c.nombres, ' ', c.apellidos) AS nombre_completo,
        ec.codigo AS estado_codigo,
        ec.nombre AS estado_nombre,
        l.nro_licencia,
        cl.codigo AS categoria_licencia,
        l.fecha_vencimiento AS licencia_vencimiento
      FROM conductores.conductor c
      JOIN conductores.estado_conductor ec ON c.id_estado = ec.id_estado
      LEFT JOIN conductores.licencia l ON c.id_conductor = l.id_conductor AND l.es_vigente = TRUE
      LEFT JOIN conductores.categoria_licencia cl ON l.id_categoria = cl.id_categoria
      WHERE c.id_conductor = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }
}

module.exports = new ConductorRepository();
