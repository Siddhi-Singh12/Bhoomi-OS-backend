const logger = require('../utils/logger');

/**
 * Global Error Handler Middleware
 * Catches all unhandled exceptions, PostgreSQL error codes, and format standardized JSON responses.
 */
function errorHandler(err, req, res, next) {
  logger.error(`Error processing ${req.method} ${req.originalUrl}: ${err.message}`, {
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    code: err.code,
  });

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: 'Duplicate entry: A record with this unique value already exists.',
      detail: err.detail,
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(404).json({
      success: false,
      error: 'Referenced resource not found.',
      detail: err.detail,
    });
  }

  // Custom known application error codes
  if (err.code === 'FARM_NOT_FOUND' || err.code === 'FARMER_NOT_FOUND' || err.code === 'ANALYSIS_NOT_FOUND') {
    return res.status(404).json({
      success: false,
      error: err.message,
    });
  }

  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
