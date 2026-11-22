/**
 * Respuestas exitosas estructuradas
 */
function sendSuccess(res, data = null, message = 'Operación exitosa', status = 200, meta = undefined) {
  return res.status(status).json({
    success: true,
    message,
    data,
    meta
  });
}

function sendCreated(res, data = null, message = 'Recurso creado exitosamente') {
  return sendSuccess(res, data, message, 201);
}

module.exports = {
  sendSuccess,
  sendCreated
};
