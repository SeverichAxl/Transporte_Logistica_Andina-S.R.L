require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { 
  correlationIdMiddleware, 
  requestLogger, 
  errorHandler, 
  logger 
} = require('@logistica-andina/shared');

const healthRoutes = require('./routes/health.routes');
const entregaRoutes = require('./routes/entrega.routes');

const app = express();
const PORT = process.env.ENTREGAS_SERVICE_PORT || process.env.PORT || 3004;

// Asegurar carpeta de uploads
const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(correlationIdMiddleware);
app.use(requestLogger);

// Servir archivos estáticos de uploads (evidencias y comprobantes)
app.use('/uploads', express.static(uploadsDir));
// También bajo el prefijo del gateway para que url_archivo funcione vía puerto 3000
app.use('/api/v1/entregas/uploads', express.static(uploadsDir));

app.use(healthRoutes);
app.use('/api/v1/entregas', entregaRoutes);
app.use('/', entregaRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`📦 Microservicio Entregas (ms-entregas) escuchando en el puerto ${PORT}`);
});
