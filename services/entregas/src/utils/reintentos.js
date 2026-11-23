const { logger } = require('@logistica-andina/shared');

/**
 * Reintenta una operación de saga solo ante fallos transitorios
 * (5xx, timeout o servicio caído). Los 4xx son errores de negocio: no se reintentan.
 */
async function reintentar(fn, { intentos = 3, delayMs = 300 } = {}) {
  let ultimoError;
  for (let intento = 1; intento <= intentos; intento++) {
    try {
      return await fn();
    } catch (err) {
      ultimoError = err;
      const transitorio = !err.status || err.status >= 500;
      if (!transitorio || intento === intentos) break;
      logger.warn(`Reintento ${intento}/${intentos} de paso de saga fallido`, {
        causa: err.message,
        code: err.code
      });
      await new Promise((r) => setTimeout(r, delayMs * intento));
    }
  }
  throw ultimoError;
}

module.exports = { reintentar };
