/**
 * Bhoomi OS Logger Utility
 * Provides standardized timestamped console logging for requests, errors, and system events.
 */

function formatMessage(level, message, meta = null) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

const logger = {
  info: (message, meta) => console.log(formatMessage('INFO', message, meta)),
  warn: (message, meta) => console.warn(formatMessage('WARN', message, meta)),
  error: (message, meta) => console.error(formatMessage('ERROR', message, meta)),
  debug: (message, meta) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(formatMessage('DEBUG', message, meta));
    }
  },
  requestLogger: (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
    });
    next();
  },
};

module.exports = logger;
