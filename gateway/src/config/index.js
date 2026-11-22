require('dotenv').config();

module.exports = {
  port: parseInt(process.env.GATEWAY_PORT || process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.FRONTEND_URL || 'http://localhost:5173',
  services: {
    envios: {
      name: 'ms-envios',
      url: process.env.ENVIOS_SERVICE_URL || 'http://localhost:3001',
      pathPrefix: '/api/v1/envios'
    },
    flota: {
      name: 'ms-flota',
      url: process.env.FLOTA_SERVICE_URL || 'http://localhost:3002',
      pathPrefix: '/api/v1/flota'
    },
    conductores: {
      name: 'ms-conductores',
      url: process.env.CONDUCTORES_SERVICE_URL || 'http://localhost:3003',
      pathPrefix: '/api/v1/conductores'
    },
    entregas: {
      name: 'ms-entregas',
      url: process.env.ENTREGAS_SERVICE_URL || 'http://localhost:3004',
      pathPrefix: '/api/v1/entregas'
    }
  }
};
