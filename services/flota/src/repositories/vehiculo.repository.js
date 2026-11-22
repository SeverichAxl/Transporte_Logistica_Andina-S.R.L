const pool = require('../config/db');

class VehiculoRepository {
  /**
   * Registra un vehículo nuevo (HU-FLO-01) en transacción
   */
  async createVehiculo({ placa, marca, modelo, anio, capacidadCargaKg, categoriaLicenciaRequerida = null, usuario = 'flota' }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Estado inicial DISPONIBLE (id 1)
      const insertQuery = `
        INSERT INTO flota.vehiculo (
          placa, marca, modelo, anio, capacidad_carga_kg, categoria_licencia_requerida, id_estado, activo
        )
        VALUES ($1, $2, $3, $4, $5, $6, 1, TRUE)
        RETURNING *
      `;
      const resVehiculo = await client.query(insertQuery, [
        placa.toUpperCase().trim(),
        marca.trim(),
        modelo.trim(),
        anio,
        capacidadCargaKg,
        categoriaLicenciaRequerida
      ]);
      const nuevoVehiculo = resVehiculo.rows[0];

      // Registrar historial inicial
      const insertHistorial = `
        INSERT INTO flota.historial_estado_vehiculo (
          id_vehiculo, id_estado_anterior, id_estado_nuevo, motivo, usuario
        )
        VALUES ($1, NULL, 1, 'Alta y registro inicial del vehículo', $2)
      `;
      await client.query(insertHistorial, [nuevoVehiculo.id_vehiculo, usuario]);

      await client.query('COMMIT');
      return this.findById(nuevoVehiculo.id_vehiculo);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Consulta paginada con filtros combinables (HU-FLO-05 y FE-FLO-01)
   */
  async findAll({ limit = 10, offset = 0, estado, placa, capacidadMin, soloActivos = true }) {
    let query = `
      SELECT 
        v.id_vehiculo,
        v.placa,
        v.marca,
        v.modelo,
        v.anio,
        v.capacidad_carga_kg,
        v.categoria_licencia_requerida,
        v.id_estado,
        ev.codigo AS estado_codigo,
        ev.nombre AS estado_nombre,
        v.activo,
        v.fecha_baja,
        v.created_at,
        v.updated_at
      FROM flota.vehiculo v
      LEFT JOIN flota.estado_vehiculo ev ON v.id_estado = ev.id_estado
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (soloActivos) {
      query += ` AND v.activo = TRUE`;
    }
    if (estado) {
      query += ` AND (ev.codigo = $${idx} OR ev.id_estado::text = $${idx})`;
      params.push(estado.toUpperCase());
      idx++;
    }
    if (placa) {
      query += ` AND v.placa ILIKE $${idx}`;
      params.push(`%${placa.trim()}%`);
      idx++;
    }
    if (capacidadMin) {
      query += ` AND v.capacidad_carga_kg >= $${idx}`;
      params.push(parseFloat(capacidadMin));
      idx++;
    }

    query += ` ORDER BY v.id_vehiculo DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    return rows;
  }

  async countAll({ estado, placa, capacidadMin, soloActivos = true }) {
    let query = `
      SELECT COUNT(*)::int AS total
      FROM flota.vehiculo v
      LEFT JOIN flota.estado_vehiculo ev ON v.id_estado = ev.id_estado
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (soloActivos) {
      query += ` AND v.activo = TRUE`;
    }
    if (estado) {
      query += ` AND (ev.codigo = $${idx} OR ev.id_estado::text = $${idx})`;
      params.push(estado.toUpperCase());
      idx++;
    }
    if (placa) {
      query += ` AND v.placa ILIKE $${idx}`;
      params.push(`%${placa.trim()}%`);
      idx++;
    }
    if (capacidadMin) {
      query += ` AND v.capacidad_carga_kg >= $${idx}`;
      params.push(parseFloat(capacidadMin));
      idx++;
    }

    const { rows } = await pool.query(query, params);
    return rows[0]?.total || 0;
  }

  /**
   * Resumen y contadores de flota para dashboard (FE-FLO-01)
   */
  async getMetricas() {
    const query = `
      SELECT 
        COUNT(*)::int AS total,
        COUNT(CASE WHEN id_estado = 1 AND activo = TRUE THEN 1 END)::int AS disponibles,
        COUNT(CASE WHEN id_estado = 2 AND activo = TRUE THEN 1 END)::int AS en_ruta,
        COUNT(CASE WHEN id_estado = 3 AND activo = TRUE THEN 1 END)::int AS mantenimiento,
        COUNT(CASE WHEN id_estado = 4 OR activo = FALSE THEN 1 END)::int AS fuera_servicio
      FROM flota.vehiculo
    `;
    const { rows } = await pool.query(query);
    return rows[0] || { total: 0, disponibles: 0, en_ruta: 0, mantenimiento: 0, fuera_servicio: 0 };
  }

  async findById(id) {
    const query = `
      SELECT 
        v.*,
        ev.codigo AS estado_codigo,
        ev.nombre AS estado_nombre
      FROM flota.vehiculo v
      LEFT JOIN flota.estado_vehiculo ev ON v.id_estado = ev.id_estado
      WHERE v.id_vehiculo = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  async findByPlaca(placa) {
    const query = `
      SELECT 
        v.*,
        ev.codigo AS estado_codigo,
        ev.nombre AS estado_nombre
      FROM flota.vehiculo v
      LEFT JOIN flota.estado_vehiculo ev ON v.id_estado = ev.id_estado
      WHERE v.placa = $1
    `;
    const { rows } = await pool.query(query, [placa.toUpperCase().trim()]);
    return rows[0] || null;
  }

  async getHistorial(idVehiculo) {
    const query = `
      SELECT 
        h.id_historial,
        h.id_vehiculo,
        h.id_estado_anterior,
        ea.codigo AS estado_anterior_codigo,
        ea.nombre AS estado_anterior_nombre,
        h.id_estado_nuevo,
        en.codigo AS estado_nuevo_codigo,
        en.nombre AS estado_nuevo_nombre,
        h.fecha_cambio,
        h.motivo,
        h.usuario
      FROM flota.historial_estado_vehiculo h
      LEFT JOIN flota.estado_vehiculo ea ON h.id_estado_anterior = ea.id_estado
      JOIN flota.estado_vehiculo en ON h.id_estado_nuevo = en.id_estado
      WHERE h.id_vehiculo = $1
      ORDER BY h.id_historial ASC
    `;
    const { rows } = await pool.query(query, [idVehiculo]);
    return rows;
  }

  /**
   * Modificar datos (HU-FLO-02)
   */
  async updateVehiculo(id, { marca, modelo, anio, capacidadCargaKg, categoriaLicenciaRequerida }) {
    const query = `
      UPDATE flota.vehiculo
      SET 
        marca = COALESCE($1, marca),
        modelo = COALESCE($2, modelo),
        anio = COALESCE($3, anio),
        capacidad_carga_kg = COALESCE($4, capacidad_carga_kg),
        categoria_licencia_requerida = COALESCE($5, categoria_licencia_requerida),
        updated_at = CURRENT_TIMESTAMP
      WHERE id_vehiculo = $6
      RETURNING *
    `;
    const { rows } = await pool.query(query, [
      marca, modelo, anio, capacidadCargaKg, categoriaLicenciaRequerida, id
    ]);
    return rows[0] || null;
  }

  /**
   * Cambiar estado operativo con motivo (HU-FLO-04)
   */
  async updateEstado(idVehiculo, { idEstadoAnterior, idEstadoNuevo, motivo, usuario = 'flota' }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updateQuery = `
        UPDATE flota.vehiculo
        SET id_estado = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id_vehiculo = $2
        RETURNING *
      `;
      const resUpdate = await client.query(updateQuery, [idEstadoNuevo, idVehiculo]);

      const insertHistorial = `
        INSERT INTO flota.historial_estado_vehiculo (
          id_vehiculo, id_estado_anterior, id_estado_nuevo, motivo, usuario
        )
        VALUES ($1, $2, $3, $4, $5)
      `;
      await client.query(insertHistorial, [idVehiculo, idEstadoAnterior, idEstadoNuevo, motivo, usuario]);

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
   * Baja lógica del vehículo (HU-FLO-03)
   */
  async bajaLogica(idVehiculo, { motivo = 'Baja de la flota', usuario = 'flota' }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Pasa a FUERA_SERVICIO (id 4), activo = FALSE y fecha_baja = NOW()
      const updateQuery = `
        UPDATE flota.vehiculo
        SET 
          id_estado = 4,
          activo = FALSE,
          fecha_baja = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id_vehiculo = $1
        RETURNING *
      `;
      const resUpdate = await client.query(updateQuery, [idVehiculo]);
      const vehiculo = resUpdate.rows[0];

      const insertHistorial = `
        INSERT INTO flota.historial_estado_vehiculo (
          id_vehiculo, id_estado_anterior, id_estado_nuevo, motivo, usuario
        )
        VALUES ($1, $2, 4, $3, $4)
      `;
      await client.query(insertHistorial, [idVehiculo, vehiculo.id_estado, motivo, usuario]);

      await client.query('COMMIT');
      return vehiculo;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getEstadoByCodigo(codigo) {
    const query = `SELECT id_estado, codigo, nombre FROM flota.estado_vehiculo WHERE codigo = $1`;
    const { rows } = await pool.query(query, [codigo.toUpperCase().trim()]);
    return rows[0] || null;
  }
}

module.exports = new VehiculoRepository();
