const { ApiError } = require('@logistica-andina/shared');

/**
 * Validaciones de entrada para MS-Entregas.
 * Los errores responden 422 con details[] para que el frontend muestre
 * el error por campo (HU-TRA-02).
 */

function _fallar(errores) {
  throw ApiError.unprocessableEntity('Los datos enviados no son válidos', errores, 'VALIDATION_ERROR');
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
 * Valida POST /entregas (HU-ENT-01).
 * Regla: la fecha de entrega no puede ser futura (tolerancia de 5 minutos
 * por diferencia de reloj entre el cliente y el servidor).
 */
function validarConfirmacionEntrega(body = {}) {
  const errores = [];

  _requerido('codigoSeguimiento', body.codigoSeguimiento, errores);
  _requerido('nombreReceptor', body.nombreReceptor, errores);

  if (String(body.nombreReceptor || '').trim().length > 150) {
    errores.push({ campo: 'nombreReceptor', mensaje: 'El nombre del receptor no puede superar los 150 caracteres' });
  }
  if (body.documentoReceptor && String(body.documentoReceptor).length > 30) {
    errores.push({ campo: 'documentoReceptor', mensaje: 'El documento no puede superar los 30 caracteres' });
  }
  if (body.observaciones && String(body.observaciones).length > 250) {
    errores.push({ campo: 'observaciones', mensaje: 'Las observaciones no pueden superar los 250 caracteres' });
  }

  if (body.fechaHoraEntrega !== undefined && body.fechaHoraEntrega !== null && body.fechaHoraEntrega !== '') {
    _fechaValida('fechaHoraEntrega', body.fechaHoraEntrega, errores);
    const fecha = new Date(body.fechaHoraEntrega);
    if (!Number.isNaN(fecha.getTime())) {
      const limiteFuturo = Date.now() + 5 * 60 * 1000;
      if (fecha.getTime() > limiteFuturo) {
        errores.push({
          campo: 'fechaHoraEntrega',
          mensaje: 'La fecha de entrega no puede ser futura'
        });
      }
    }
  }

  if (errores.length) _fallar(errores);
  return true;
}

/**
 * Valida POST /entregas/:id/comprobante (HU-ENT-03).
 * codigoEnvio es obligatorio porque MS-Entregas no persiste el código de
 * seguimiento (solo id_envio) y no existe endpoint por id en MS-Envíos:
 * con el código se valida la coherencia vía GET /api/v1/envios/:codigo.
 */
function validarGeneracionComprobante(body = {}) {
  const errores = [];
  _requerido('codigoEnvio', body.codigoEnvio, errores);
  if (errores.length) _fallar(errores);
  return true;
}

module.exports = { validarConfirmacionEntrega, validarGeneracionComprobante };
