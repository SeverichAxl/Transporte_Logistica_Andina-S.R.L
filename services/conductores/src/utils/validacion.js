const { ApiError } = require('@logistica-andina/shared');

/**
 * Validaciones de entrada para MS-Conductores.
 * Regla de negocio: los errores de validación responden 422 con details[]
 * para que el frontend pueda mostrar el error por campo (HU-TRA-02).
 */

function _fallar(errores) {
  throw ApiError.unprocessableEntity(
    'Los datos enviados no son válidos',
    errores,
    'VALIDATION_ERROR'
  );
}

function _requerido(campo, valor, errores, etiqueta = campo) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    errores.push({ campo, mensaje: `El campo ${etiqueta} es obligatorio` });
    return true;
  }
  return false;
}

function _fechaValida(campo, valor, errores) {
  if (!valor) return true;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    errores.push({ campo, mensaje: `El campo ${campo} debe ser una fecha válida (ISO 8601)` });
    return true;
  }
  return false;
}

/**
 * Valida el cuerpo de POST /conductores (HU-CON-01)
 */
function validarCreacionConductor(body = {}) {
  const errores = [];

  _requerido('tipoDocumento', body.tipoDocumento, errores);
  _requerido('nroDocumento', body.nroDocumento, errores);
  _requerido('nombres', body.nombres, errores);
  _requerido('apellidos', body.apellidos, errores);
  _requerido('fechaNacimiento', body.fechaNacimiento, errores);

  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
    errores.push({ campo: 'email', mensaje: 'El formato del email no es válido' });
  }

  _fechaValida('fechaNacimiento', body.fechaNacimiento, errores);

  const licencia = body.licencia || {};
  _requerido('licencia.nroLicencia', licencia.nroLicencia, errores, 'nroLicencia de la licencia');
  _requerido('licencia.categoria', licencia.categoria, errores, 'categoría de la licencia');
  _requerido('licencia.fechaEmision', licencia.fechaEmision, errores, 'fechaEmisión de la licencia');
  _requerido('licencia.fechaVencimiento', licencia.fechaVencimiento, errores, 'fechaVencimiento de la licencia');

  _fechaValida('licencia.fechaEmision', licencia.fechaEmision, errores);
  _fechaValida('licencia.fechaVencimiento', licencia.fechaVencimiento, errores);

  if (
    licencia.fechaEmision &&
    licencia.fechaVencimiento &&
    !Number.isNaN(new Date(licencia.fechaEmision).getTime()) &&
    !Number.isNaN(new Date(licencia.fechaVencimiento).getTime()) &&
    new Date(licencia.fechaVencimiento) <= new Date(licencia.fechaEmision)
  ) {
    errores.push({
      campo: 'licencia.fechaVencimiento',
      mensaje: 'La fecha de vencimiento debe ser posterior a la fecha de emisión'
    });
  }

  const CATEGORIAS = ['A', 'B', 'C', 'P'];
  if (licencia.categoria && !CATEGORIAS.includes(String(licencia.categoria).toUpperCase())) {
    errores.push({
      campo: 'licencia.categoria',
      mensaje: `La categoría debe ser una de: ${CATEGORIAS.join(', ')}`
    });
  }

  if (body.fechaNacimiento && !Number.isNaN(new Date(body.fechaNacimiento).getTime())) {
    const dieciocho = new Date();
    dieciocho.setFullYear(dieciocho.getFullYear() - 18);
    if (new Date(body.fechaNacimiento) > dieciocho) {
      errores.push({
        campo: 'fechaNacimiento',
        mensaje: 'El conductor debe ser mayor de 18 años'
      });
    }
  }

  if (errores.length) _fallar(errores);
  return true;
}

/**
 * Valida el cuerpo de PUT /conductores/:id (HU-CON-02)
 */
function validarActualizacionConductor(body = {}) {
  const errores = [];
  const campos = ['tipoDocumento', 'nroDocumento', 'nombres', 'apellidos', 'fechaNacimiento'];

  campos.forEach((campo) => {
    if (body[campo] !== undefined && String(body[campo]).trim() === '') {
      errores.push({ campo, mensaje: `El campo ${campo} no puede estar vacío` });
    }
  });

  if (body.email !== undefined && body.email !== null && body.email !== '' &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
    errores.push({ campo: 'email', mensaje: 'El formato del email no es válido' });
  }

  if (body.fechaNacimiento !== undefined) {
    _fechaValida('fechaNacimiento', body.fechaNacimiento, errores);
    if (!Number.isNaN(new Date(body.fechaNacimiento).getTime())) {
      const dieciocho = new Date();
      dieciocho.setFullYear(dieciocho.getFullYear() - 18);
      if (new Date(body.fechaNacimiento) > dieciocho) {
        errores.push({ campo: 'fechaNacimiento', mensaje: 'El conductor debe ser mayor de 18 años' });
      }
    }
  }

  if (errores.length) _fallar(errores);
  return true;
}

/**
 * Valida el cuerpo de POST /conductores/:id/licencias (HU-CON-02 renovación)
 */
function validarRenovacionLicencia(body = {}) {
  const errores = [];

  _requerido('nroLicencia', body.nroLicencia, errores);
  _requerido('categoria', body.categoria, errores);
  _requerido('fechaEmision', body.fechaEmision, errores);
  _requerido('fechaVencimiento', body.fechaVencimiento, errores);

  _fechaValida('fechaEmision', body.fechaEmision, errores);
  _fechaValida('fechaVencimiento', body.fechaVencimiento, errores);

  if (
    body.fechaEmision &&
    body.fechaVencimiento &&
    !Number.isNaN(new Date(body.fechaEmision).getTime()) &&
    !Number.isNaN(new Date(body.fechaVencimiento).getTime()) &&
    new Date(body.fechaVencimiento) <= new Date(body.fechaEmision)
  ) {
    errores.push({
      campo: 'fechaVencimiento',
      mensaje: 'La fecha de vencimiento debe ser posterior a la fecha de emisión'
    });
  }

  const CATEGORIAS = ['A', 'B', 'C', 'P'];
  if (body.categoria && !CATEGORIAS.includes(String(body.categoria).toUpperCase())) {
    errores.push({ campo: 'categoria', mensaje: `La categoría debe ser una de: ${CATEGORIAS.join(', ')}` });
  }

  if (errores.length) _fallar(errores);
  return true;
}

/**
 * Valida el cuerpo de POST /asignaciones (HU-CON-04)
 */
function validarCreacionAsignacion(body = {}) {
  const errores = [];

  _requerido('codigoSeguimiento', body.codigoSeguimiento, errores);
  _requerido('placa', body.placa, errores);

  if (body.idConductor === undefined || body.idConductor === null || body.idConductor === '') {
    errores.push({ campo: 'idConductor', mensaje: 'El campo idConductor es obligatorio' });
  } else if (!Number.isInteger(Number(body.idConductor)) || Number(body.idConductor) <= 0) {
    errores.push({ campo: 'idConductor', mensaje: 'El campo idConductor debe ser un número entero positivo' });
  }

  if (body.observacion && String(body.observacion).length > 250) {
    errores.push({ campo: 'observacion', mensaje: 'La observación no puede superar los 250 caracteres' });
  }

  if (errores.length) _fallar(errores);
  return true;
}

/**
 * Valida el cuerpo de PATCH /asignaciones/:id/finalizar|cancelar (HU-CON-05)
 */
function validarCierreAsignacion(body = {}, { requiereMotivo = false } = {}) {
  const errores = [];

  if (requiereMotivo) _requerido('motivo', body.motivo, errores);

  if (body.observacion && String(body.observacion).length > 250) {
    errores.push({ campo: 'observacion', mensaje: 'La observación no puede superar los 250 caracteres' });
  }
  if (body.motivo && String(body.motivo).length > 250) {
    errores.push({ campo: 'motivo', mensaje: 'El motivo no puede superar los 250 caracteres' });
  }

  if (errores.length) _fallar(errores);
  return true;
}

module.exports = {
  validarCreacionConductor,
  validarActualizacionConductor,
  validarRenovacionLicencia,
  validarCreacionAsignacion,
  validarCierreAsignacion
};
