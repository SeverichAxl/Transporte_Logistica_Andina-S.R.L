import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para inyectar Correlation ID si no existe
axiosClient.interceptors.request.use((config) => {
  if (!config.headers['X-Correlation-Id']) {
    config.headers['X-Correlation-Id'] = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  return config;
});

// Interceptor global de respuestas y errores
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let errorMessage = 'Ha ocurrido un error inesperado al conectar con el servidor';
    let errorCode = 'UNKNOWN_ERROR';
    let errorDetails = null;

    if (error.response) {
      // El servidor respondió con un código de estado fuera de 2xx
      const errorData = error.response.data?.error || error.response.data;
      errorCode = errorData?.code || `HTTP_${error.response.status}`;
      errorMessage = errorData?.message || `Error del servidor (${error.response.status})`;
      errorDetails = errorData?.details || null;
    } else if (error.request) {
      // La solicitud fue realizada pero no hubo respuesta (API Gateway o microservicio apagado)
      errorMessage = 'No se pudo conectar con el API Gateway (puerto 3000). Verifique que los servicios estén activos.';
      errorCode = 'NETWORK_ERROR';
    } else {
      errorMessage = error.message;
    }

    console.error(`[API Error] [${errorCode}]: ${errorMessage}`, errorDetails);

    return Promise.reject({
      message: errorMessage,
      code: errorCode,
      details: errorDetails,
      status: error.response?.status
    });
  }
);

export default axiosClient;
