const ApiError = require('./errors/ApiError');
const errorHandler = require('./errors/errorHandler');
const correlationIdMiddleware = require('./middlewares/correlationId');
const requestLogger = require('./middlewares/requestLogger');
const { getPaginationParams, buildPaginatedResponse } = require('./utils/pagination');
const { sendSuccess, sendCreated } = require('./utils/response');
const logger = require('./utils/logger');
const createDbPool = require('./db/createPool');
const createHttpClient = require('./http/httpClient');

module.exports = {
  ApiError,
  errorHandler,
  correlationIdMiddleware,
  requestLogger,
  getPaginationParams,
  buildPaginatedResponse,
  sendSuccess,
  sendCreated,
  logger,
  createDbPool,
  createHttpClient
};
