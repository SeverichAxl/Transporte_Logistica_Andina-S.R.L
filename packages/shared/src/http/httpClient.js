const axios = require('axios');
const ApiError = require('../errors/ApiError');
const logger = require('../utils/logger');

/**
 * Crea una instancia de cliente HTTP configurada para comunicación entre microservicios
 */
function createHttpClient(baseURL, options = {}) {
  const instance = axios.create({
    baseURL,
    timeout: options.timeout || 5000,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  // Interceptor para propagar X-Correlation-Id
  instance.interceptors.request.use((config) => {
    if (options.getCorrelationId) {
      const cid = options.getCorrelationId();
      if (cid) config.headers['X-Correlation-Id'] = cid;
    }
    return config;
  });

  // Interceptor para manejo homogéneo de errores y traducción a ApiError
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.code === 'ECONNABORTED') {
        throw ApiError.serviceUnavailable(`Timeout al conectar con servicio dependiente en ${baseURL}`);
      }
      if (error.code === 'ECONNREFUSED' || !error.response) {
        throw ApiError.badGateway(`Servicio dependiente en ${baseURL} no disponible o no responde`);
      }
      const status = error.response.status;
      const data = error.response.data;
      throw new ApiError(
        status,
        data?.error?.code || 'DEPENDENT_SERVICE_ERROR',
        data?.error?.message || error.message,
        data?.error?.details || null
      );
    }
  );

  return instance;
}

module.exports = createHttpClient;
