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
const vehiculoRoutes = require('./routes/vehiculo.routes');

const app = express();
const PORT = process.env.FLOTA_SERVICE_PORT || process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(correlationIdMiddleware);
app.use(requestLogger);

app.use(healthRoutes);
app.use('/api/v1/flota', vehiculoRoutes);
app.use('/', vehiculoRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`🚛 Microservicio Flota (ms-flota) escuchando en el puerto ${PORT}`);
});
