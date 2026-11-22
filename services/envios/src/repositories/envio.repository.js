const pool = require('../config/db');

/**
 * Capa de acceso a datos para Envíos
 */
class EnvioRepository {
  async findAll({ limit = 10, offset = 0, estado, codigo }) {
    let query = `
      SELECT 
        e.id_envio,
        e.codigo_seguimiento,
        e.id_remitente,
        r.nombre_completo AS remitente_nombre,
        e.id_destinatario,
        d.nombre_completo AS destinatario_nombre,
        e.id_ciudad_origen,
        co.nombre AS ciudad_origen,
        e.id_ciudad_destino,
        cd.nombre AS ciudad_destino,
        e.id_estado,
        es.codigo AS estado_codigo,
        es.nombre AS estado_nombre,
        e.peso_kg,
        e.descripcion_contenido,
        e.fecha_registro,
        e.fecha_estimada_entrega
      FROM envios.envio e
      LEFT JOIN envios.contacto r ON e.id_remitente = r.id_contacto
      LEFT JOIN envios.contacto d ON e.id_destinatario = d.id_contacto
      LEFT JOIN envios.ciudad co ON e.id_ciudad_origen = co.id_ciudad
      LEFT JOIN envios.ciudad cd ON e.id_ciudad_destino = cd.id_ciudad
      LEFT JOIN envios.estado_envio es ON e.id_estado = es.id_estado
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (estado) {
      query += ` AND es.codigo = $${idx++}`;
      params.push(estado);
    }
    if (codigo) {
      query += ` AND e.codigo_seguimiento ILIKE $${idx++}`;
      params.push(`%${codigo}%`);
    }

    query += ` ORDER BY e.id_envio DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    return rows;
  }

  async countAll({ estado, codigo }) {
    let query = `
      SELECT COUNT(*)::int AS total
      FROM envios.envio e
      LEFT JOIN envios.estado_envio es ON e.id_estado = es.id_estado
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (estado) {
      query += ` AND es.codigo = $${idx++}`;
      params.push(estado);
    }
    if (codigo) {
      query += ` AND e.codigo_seguimiento ILIKE $${idx++}`;
      params.push(`%${codigo}%`);
    }

    const { rows } = await pool.query(query, params);
    return rows[0]?.total || 0;
  }

  async findByCodigo(codigo) {
    const query = `
      SELECT 
        e.*,
        es.codigo AS estado_codigo,
        es.nombre AS estado_nombre
      FROM envios.envio e
      JOIN envios.estado_envio es ON e.id_estado = es.id_estado
      WHERE e.codigo_seguimiento = $1
    `;
    const { rows } = await pool.query(query, [codigo]);
    return rows[0] || null;
  }
}

module.exports = new EnvioRepository();
