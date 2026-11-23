const pool = require('../config/db');
const { ApiError } = require('@logistica-andina/shared');

class AsignacionRepository {
  /**
   * Consulta de asignaciones con filtros (HU-CON-06).
   * Filtros: estado (ACTIVA|FINALIZADA|CANCELADA), idEnvio, idConductor, idVehiculo.
   */
  async findAll({ limit = 10, offset = 0, estado, idEnvio, idConductor, idVehiculo } = {}) {
    let query = `
      SELECT 
        a.id_asignacion,
        a.id_conductor,
        CONCAT(c.nombres, ' ', c.apellidos) AS nombre_conductor,
        c.nro_documento AS documento_conductor,
        a.id_vehiculo,
        a.id_envio,
        a.id_estado,
        ea.codigo AS estado_codigo,
        ea.nombre AS estado_nombre,
        a.fecha_asignacion,
        a.fecha_fin,
        a.observacion
      FROM conductores.asignacion a
      JOIN conductores.conductor c ON a.id_conductor = c.id_conductor
      JOIN conductores.estado_asignacion ea ON a.id_estado = ea.id_estado
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (estado) {
      query += ` AND ea.codigo = $${idx++}`;
      params.push(estado);
    }
    if (idEnvio) {
      query += ` AND a.id_envio = $${idx++}`;
      params.push(idEnvio);
    }
    if (idConductor) {
      query += ` AND a.id_conductor = $${idx++}`;
      params.push(idConductor);
    }
    if (idVehiculo) {
      query += ` AND a.id_vehiculo = $${idx++}`;
      params.push(idVehiculo);
    }

    query += ` ORDER BY a.fecha_asignacion DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    return rows;
  }

  async countAll({ estado, idEnvio, idConductor, idVehiculo } = {}) {
    let query = `
      SELECT COUNT(*)::int AS total
      FROM conductores.asignacion a
      JOIN conductores.estado_asignacion ea ON a.id_estado = ea.id_estado
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (estado) {
      query += ` AND ea.codigo = $${idx++}`;
      params.push(estado);
    }
    if (idEnvio) {
      query += ` AND a.id_envio = $${idx++}`;
      params.push(idEnvio);
    }
    if (idConductor) {
      query += ` AND a.id_conductor = $${idx++}`;
      params.push(idConductor);
    }
    if (idVehiculo) {
      query += ` AND a.id_vehiculo = $${idx++}`;
      params.push(idVehiculo);
    }

    const { rows } = await pool.query(query, params);
    return rows[0]?.total || 0;
  }

  async findById(id) {
    const query = `
      SELECT 
        a.*,
        CONCAT(c.nombres, ' ', c.apellidos) AS nombre_conductor,
        ea.codigo AS estado_codigo
      FROM conductores.asignacion a
      JOIN conductores.conductor c ON a.id_conductor = c.id_conductor
      JOIN conductores.estado_asignacion ea ON a.id_estado = ea.id_estado
      WHERE a.id_asignacion = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /** Asignación ACTIVA vigente de un envío (la usa MS-Entregas para su snapshot) */
  async findActivaPorEnvio(idEnvio) {
    const { rows } = await pool.query(
      `SELECT a.*, CONCAT(c.nombres, ' ', c.apellidos) AS nombre_conductor
         FROM conductores.asignacion a
         JOIN conductores.conductor c ON a.id_conductor = c.id_conductor
        WHERE a.id_envio = $1 AND a.id_estado = 1`,
      [idEnvio]
    );
    return rows[0] || null;
  }

  /**
   * Crea la asignación y marca el conductor como OCUPADO (HU-CON-04).
   * Los índices únicos parciales de BD impiden duplicar asignaciones activas
   * por conductor, vehículo o envío (defensa adicional ante carreras).
   */
  async crear({ idConductor, idVehiculo, idEnvio, observacion = null }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `INSERT INTO conductores.asignacion (id_conductor, id_vehiculo, id_envio, observacion)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [idConductor, idVehiculo, idEnvio, observacion]
      );

      await client.query(
        `UPDATE conductores.conductor
            SET id_estado = (SELECT id_estado FROM conductores.estado_conductor WHERE codigo = 'OCUPADO')
          WHERE id_conductor = $1`,
        [idConductor]
      );

      await client.query('COMMIT');
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Cierra la asignación (FINALIZADA o CANCELADA) y libera el conductor (HU-CON-05).
   * Lanza un error si la asignación ya estaba cerrada.
   */
  async cerrar(id, codigoEstado, observacion = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: previas } = await client.query(
        `SELECT a.id_asignacion, a.id_conductor, a.id_estado, ea.codigo
           FROM conductores.asignacion a
           JOIN conductores.estado_asignacion ea ON a.id_estado = ea.id_estado
          WHERE a.id_asignacion = $1
          FOR UPDATE`,
        [id]
      );
      if (!previas.length) {
        throw ApiError.notFound(`Asignación ${id} no encontrada`);
      }
      if (previas[0].codigo !== 'ACTIVA') {
        throw ApiError.conflict(
          `La asignación ${id} ya fue cerrada con estado ${previas[0].codigo}`,
          { idAsignacion: Number(id), estado: previas[0].codigo },
          'ASIGNACION_CERRADA'
        );
      }

      const { rows } = await client.query(
        `UPDATE conductores.asignacion a
            SET id_estado = e.id_estado,
                fecha_fin = CURRENT_TIMESTAMP,
                observacion = COALESCE($2, a.observacion)
           FROM conductores.estado_asignacion e
          WHERE a.id_asignacion = $1 AND e.codigo = $3
          RETURNING a.*`,
        [id, observacion, codigoEstado]
      );

      await client.query(
        `UPDATE conductores.conductor
            SET id_estado = (SELECT id_estado FROM conductores.estado_conductor WHERE codigo = 'DISPONIBLE')
          WHERE id_conductor = $1`,
        [previas[0].id_conductor]
      );

      await client.query('COMMIT');
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** Resumen de asignaciones activas por estado (DAS-00) */
  async resumenPorEstado() {
    const { rows } = await pool.query(
      `SELECT ea.codigo AS estado, COUNT(a.id_asignacion)::int AS total
         FROM conductores.estado_asignacion ea
         LEFT JOIN conductores.asignacion a ON a.id_estado = ea.id_estado
        GROUP BY ea.id_estado, ea.codigo
        ORDER BY ea.id_estado`
    );
    return rows;
  }

  async countActivas() {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM conductores.asignacion WHERE id_estado = 1`
    );
    return rows[0]?.total || 0;
  }
}

module.exports = new AsignacionRepository();
