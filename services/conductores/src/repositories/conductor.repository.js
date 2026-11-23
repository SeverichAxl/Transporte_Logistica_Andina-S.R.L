const pool = require('../config/db');
const { ApiError } = require('@logistica-andina/shared');

class ConductorRepository {
  _filtros({ estado, documento, nombre } = {}) {
    let query = '';
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
    if (nombre) {
      query += ` AND (c.nombres ILIKE $${idx} OR c.apellidos ILIKE $${idx} OR CONCAT(c.nombres, ' ', c.apellidos) ILIKE $${idx})`;
      params.push(`%${nombre}%`);
      idx += 1;
    }

    return { query, params, idx };
  }

  async findAll({ limit = 10, offset = 0, estado, documento, nombre }) {
    const { query: filtros, params, idx } = this._filtros({ estado, documento, nombre });

    const query = `
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
        c.direccion,
        c.id_estado,
        ec.codigo AS estado_codigo,
        ec.nombre AS estado_nombre,
        l.nro_licencia,
        l.id_categoria,
        cl.codigo AS categoria_licencia,
        l.fecha_emision AS licencia_emision,
        l.fecha_vencimiento AS licencia_vencimiento,
        c.created_at,
        c.updated_at
      FROM conductores.conductor c
      LEFT JOIN conductores.estado_conductor ec ON c.id_estado = ec.id_estado
      LEFT JOIN conductores.licencia l ON c.id_conductor = l.id_conductor AND l.es_principal = TRUE
      LEFT JOIN conductores.categoria_licencia cl ON l.id_categoria = cl.id_categoria
      WHERE 1=1
      ${filtros}
      ORDER BY c.id_conductor DESC LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);
    return rows;
  }

  async countAll({ estado, documento, nombre } = {}) {
    const { query: filtros, params } = this._filtros({ estado, documento, nombre });

    const query = `
      SELECT COUNT(*)::int AS total
      FROM conductores.conductor c
      LEFT JOIN conductores.estado_conductor ec ON c.id_estado = ec.id_estado
      WHERE 1=1
      ${filtros}
    `;

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
        l.id_categoria,
        cl.codigo AS categoria_licencia,
        l.fecha_emision AS licencia_emision,
        l.fecha_vencimiento AS licencia_vencimiento,
        l.es_principal AS licencia_principal
      FROM conductores.conductor c
      JOIN conductores.estado_conductor ec ON c.id_estado = ec.id_estado
      LEFT JOIN conductores.licencia l ON c.id_conductor = l.id_conductor AND l.es_principal = TRUE
      LEFT JOIN conductores.categoria_licencia cl ON l.id_categoria = cl.id_categoria
      WHERE c.id_conductor = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  async findByDocumento(tipoDocumento, nroDocumento, exceptoId = null) {
    const params = [tipoDocumento, nroDocumento];
    let extra = '';
    if (exceptoId) {
      extra = ' AND c.id_conductor <> $3';
      params.push(exceptoId);
    }
    const { rows } = await pool.query(
      `SELECT c.id_conductor FROM conductores.conductor c
       WHERE c.tipo_documento = $1 AND c.nro_documento = $2${extra}`,
      params
    );
    return rows[0] || null;
  }

  /**
   * Crea conductor y su licencia principal en una sola transacción (HU-CON-01).
   * El estado inicial es DISPONIBLE (id 1) y la mayoría de edad se refuerza en BD (trigger).
   */
  async crearConductorConLicencia({ conductor, licencia }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: estado } = await client.query(
        `SELECT id_estado FROM conductores.estado_conductor WHERE codigo = 'DISPONIBLE'`
      );
      const { rows: categoria } = await client.query(
        `SELECT id_categoria FROM conductores.categoria_licencia WHERE upper(codigo) = upper($1)`,
        [licencia.categoria]
      );
      if (!categoria.length) {
        throw ApiError.unprocessableEntity(
          `Categoría de licencia inválida: ${licencia.categoria}`,
          null,
          'CATEGORIA_INVALIDA'
        );
      }

      const { rows } = await client.query(
        `INSERT INTO conductores.conductor
           (tipo_documento, nro_documento, nombres, apellidos, fecha_nacimiento, telefono, email, direccion, id_estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          conductor.tipoDocumento,
          conductor.nroDocumento,
          conductor.nombres,
          conductor.apellidos,
          conductor.fechaNacimiento,
          conductor.telefono || null,
          conductor.email || null,
          conductor.direccion || null,
          estado[0].id_estado
        ]
      );
      const nuevo = rows[0];

      await client.query(
        `INSERT INTO conductores.licencia
           (id_conductor, nro_licencia, id_categoria, fecha_emision, fecha_vencimiento, es_principal)
         VALUES ($1, $2, $3, $4, $5, TRUE)`,
        [
          nuevo.id_conductor,
          licencia.nroLicencia,
          categoria[0].id_categoria,
          licencia.fechaEmision,
          licencia.fechaVencimiento
        ]
      );

      await client.query('COMMIT');
      return nuevo;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async actualizar(id, datos) {
    const campos = [];
    const params = [];
    let idx = 1;

    const mapa = {
      tipoDocumento: 'tipo_documento',
      nroDocumento: 'nro_documento',
      nombres: 'nombres',
      apellidos: 'apellidos',
      fechaNacimiento: 'fecha_nacimiento',
      telefono: 'telefono',
      email: 'email',
      direccion: 'direccion'
    };

    Object.entries(mapa).forEach(([prop, columna]) => {
      if (datos[prop] !== undefined) {
        campos.push(`${columna} = $${idx++}`);
        params.push(datos[prop] === '' ? null : datos[prop]);
      }
    });

    if (!campos.length) return null;

    params.push(id);
    const { rows } = await pool.query(
      `UPDATE conductores.conductor SET ${campos.join(', ')} WHERE id_conductor = $${idx} RETURNING *`,
      params
    );
    return rows[0] || null;
  }

  async cambiarEstado(id, codigoEstado) {
    const { rows } = await pool.query(
      `UPDATE conductores.conductor c
          SET id_estado = e.id_estado
         FROM conductores.estado_conductor e
        WHERE c.id_conductor = $1 AND e.codigo = $2
        RETURNING c.id_conductor, e.codigo AS estado_codigo`,
      [id, codigoEstado]
    );
    return rows[0] || null;
  }

  /** Historial de licencias de un conductor (HU-CON-02 / FE-CON-01) */
  async listarLicencias(idConductor) {
    const { rows } = await pool.query(
      `SELECT l.id_licencia, l.nro_licencia, l.id_categoria, cl.codigo AS categoria,
              l.fecha_emision, l.fecha_vencimiento, l.es_principal, l.created_at,
              (l.fecha_vencimiento >= CURRENT_DATE) AS vigente,
              (l.fecha_vencimiento - CURRENT_DATE) AS dias_para_vencer
         FROM conductores.licencia l
         JOIN conductores.categoria_licencia cl ON l.id_categoria = cl.id_categoria
        WHERE l.id_conductor = $1
        ORDER BY l.es_principal DESC, l.fecha_vencimiento DESC`,
      [idConductor]
    );
    return rows;
  }

  /**
   * Renueva la licencia: la anterior deja de ser principal y se conserva en histórico (HU-CON-02).
   * El índice único licencia_principal_uq garantiza una sola principal por conductor.
   */
  async renovarLicencia(idConductor, licencia) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: categoria } = await client.query(
        `SELECT id_categoria FROM conductores.categoria_licencia WHERE upper(codigo) = upper($1)`,
        [licencia.categoria]
      );
      if (!categoria.length) {
        throw ApiError.unprocessableEntity(
          `Categoría de licencia inválida: ${licencia.categoria}`,
          null,
          'CATEGORIA_INVALIDA'
        );
      }

      await client.query(
        `UPDATE conductores.licencia SET es_principal = FALSE
          WHERE id_conductor = $1 AND es_principal = TRUE`,
        [idConductor]
      );

      const { rows } = await client.query(
        `INSERT INTO conductores.licencia
           (id_conductor, nro_licencia, id_categoria, fecha_emision, fecha_vencimiento, es_principal)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         RETURNING *`,
        [
          idConductor,
          licencia.nroLicencia,
          categoria[0].id_categoria,
          licencia.fechaEmision,
          licencia.fechaVencimiento
        ]
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
   * Alertas de licencias vencidas o por vencer en ≤30 días (HU-CON-03).
   * Usa la vista v_licencia_estado y solo considera la licencia principal.
   */
  async alertasLicencias(dias = 30) {
    const { rows } = await pool.query(
      `SELECT v.id_licencia, v.id_conductor,
              CONCAT(c.nombres, ' ', c.apellidos) AS nombre_conductor,
              c.nro_documento, v.nro_licencia, cl.codigo AS categoria,
              v.fecha_vencimiento, v.vigente, v.dias_para_vencer,
              ec.codigo AS estado_conductor,
              CASE
                WHEN NOT v.vigente THEN 'VENCIDA'
                WHEN v.dias_para_vencer <= 15 THEN 'CRITICA'
                ELSE 'POR_VENCER'
              END AS alerta
         FROM conductores.v_licencia_estado v
         JOIN conductores.conductor c ON v.id_conductor = c.id_conductor
         JOIN conductores.categoria_licencia cl ON v.id_categoria = cl.id_categoria
         JOIN conductores.estado_conductor ec ON c.id_estado = ec.id_estado
        WHERE v.es_principal = TRUE
          AND v.dias_para_vencer <= $1
        ORDER BY v.fecha_vencimiento ASC`,
      [dias]
    );
    return rows;
  }

  /** Resumen por estado para el dashboard (DAS-00) */
  async resumenPorEstado() {
    const { rows } = await pool.query(
      `SELECT ec.codigo AS estado, COUNT(c.id_conductor)::int AS total
         FROM conductores.estado_conductor ec
         LEFT JOIN conductores.conductor c ON c.id_estado = ec.id_estado
        GROUP BY ec.id_estado, ec.codigo
        ORDER BY ec.id_estado`
    );
    return rows;
  }
}

module.exports = new ConductorRepository();
