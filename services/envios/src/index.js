require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { 
  correlationIdMiddleware, 
  requestLogger, 
  errorHandler, 
  logger 
} = require('@logistica-andina/shared');

const healthRoutes = require('./routes/health.routes');
const envioRoutes = require('./routes/envio.routes');

const app = express();
const PORT = process.env.ENVIOS_SERVICE_PORT || process.env.PORT || 3001;

// Middlewares estándar
app.use(cors());
app.use(express.json());
app.use(correlationIdMiddleware);
app.use(requestLogger);

// Rutas del servicio
app.use(healthRoutes);
app.use('/api/v1/envios', envioRoutes);
app.use('/', envioRoutes); // Permite consumo directo y vía proxy

// Middleware de manejo central de errores
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`🚚 Microservicio Envíos (ms-envios) escuchando en el puerto ${PORT}`);
});
