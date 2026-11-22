const pool = require('../config/db');

class VehiculoRepository {
  async findAll({ limit = 10, offset = 0, estado, placa }) {
    let query = `
      SELECT 
        v.id_vehiculo,
        v.placa,
        v.marca,
        v.modelo,
        v.anio,
        v.capacidad_carga_kg,
        v.activo,
        v.id_estado,
        ev.codigo AS estado_codigo,
        ev.nombre AS estado_nombre,
        v.created_at
      FROM flota.vehiculo v
      LEFT JOIN flota.estado_vehiculo ev ON v.id_estado = ev.id_estado
      WHERE v.activo = TRUE
    `;
    const params = [];
    let idx = 1;

    if (estado) {
      query += ` AND ev.codigo = $${idx++}`;
      params.push(estado);
    }
    if (placa) {
      query += ` AND v.placa ILIKE $${idx++}`;
      params.push(`%${placa}%`);
    }

    query += ` ORDER BY v.id_vehiculo DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    return rows;
  }

  async countAll({ estado, placa }) {
    let query = `
      SELECT COUNT(*)::int AS total
      FROM flota.vehiculo v
      LEFT JOIN flota.estado_vehiculo ev ON v.id_estado = ev.id_estado
      WHERE v.activo = TRUE
    `;
    const params = [];
    let idx = 1;

    if (estado) {
      query += ` AND ev.codigo = $${idx++}`;
      params.push(estado);
    }
    if (placa) {
      query += ` AND v.placa ILIKE $${idx++}`;
      params.push(`%${placa}%`);
    }

    const { rows } = await pool.query(query, params);
    return rows[0]?.total || 0;
  }

  async findByPlaca(placa) {
    const query = `
      SELECT 
        v.*,
        ev.codigo AS estado_codigo,
        ev.nombre AS estado_nombre
      FROM flota.vehiculo v
      JOIN flota.estado_vehiculo ev ON v.id_estado = ev.id_estado
      WHERE v.placa = $1 AND v.activo = TRUE
    `;
    const { rows } = await pool.query(query, [placa]);
    return rows[0] || null;
  }
}

module.exports = new VehiculoRepository();
