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
const conductorRoutes = require('./routes/conductor.routes');
const asignacionRoutes = require('./routes/asignacion.routes');

const app = express();
const PORT = process.env.CONDUCTORES_SERVICE_PORT || process.env.PORT || 3003;

app.use(cors());
app.use(express.json());
app.use(correlationIdMiddleware);
app.use(requestLogger);

app.use(healthRoutes);

// Asignaciones montadas antes que /api/v1/conductores para que
// /api/v1/conductores/asignaciones no la capture el :id del conductor.
app.use('/api/v1/conductores/asignaciones', asignacionRoutes);
app.use('/api/v1/conductores', conductorRoutes);

// Acceso directo al microservicio (sin gateway) para llamadas internas
app.use('/asignaciones', asignacionRoutes);
app.use('/', conductorRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`👨‍✈️ Microservicio Conductores (ms-conductores) escuchando en el puerto ${PORT}`);
});
