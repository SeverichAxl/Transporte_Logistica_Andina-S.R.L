const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');
const config = require('./config');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const { optionalAuth } = require('./auth/auth.middleware');
const setupProxies = require('./middlewares/proxy');

const app = express();

// Configuración de CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id', 'Idempotency-Key']
}));

// Inyección / propagación de Correlation ID
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || randomUUID();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  next();
});

// Middleware de autenticación opcional que decodifica JWT si viene en el header Authorization
app.use(optionalAuth);

// Logger básico para gateway
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const userRole = req.user ? `[${req.user.rol}:${req.user.username}]` : '[Anon]';
    console.log(`[GATEWAY] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms) ${userRole} [CID: ${req.correlationId}]`);
  });
  next();
});

// Rutas directas del Gateway (usan express.json localmente para no interferir con los streams proxificados)
app.use(healthRoutes);
app.use('/api/v1/auth', express.json(), authRoutes);
app.use('/auth', express.json(), authRoutes); // Alias directo según criterios SEG-02

// Proxies a microservicios (el stream del body fluye sin bloqueo a los servicios)
setupProxies(app);

// Manejador de 404 para rutas no encontradas en el Gateway
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
      status: 404,
      code: 'NOT_FOUND',
      message: `Ruta ${req.originalUrl} no encontrada en el API Gateway`,
      path: req.originalUrl
    }
  });
});

app.listen(config.port, () => {
  console.log(`🚀 API Gateway escuchando en el puerto ${config.port}`);
  console.log(`🔐 Módulo de Autenticación montado en /api/v1/auth y /auth (5 usuarios activos)`);
  console.log(`📡 Rutas proxificadas:`);
  Object.values(config.services).forEach(s => {
    console.log(`   - ${s.pathPrefix} -> ${s.url}`);
  });
});
