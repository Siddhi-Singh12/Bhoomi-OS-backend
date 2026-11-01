const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');
const { runSqliteQuery } = require('./sqliteStore');

let pgPool = null;
let isPgReachable = null;

// Initialize PG Pool if connection string is configured
if (env.databaseUrl && !env.databaseUrl.includes('localhost') && !process.env.FORCE_OFFLINE_DB) {
  try {
    pgPool = new Pool({
      connectionString: env.databaseUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000,
    });
  } catch (err) {
    logger.warn(`PostgreSQL Pool initialization skipped: ${err.message}`);
  }
}

/**
 * Resilient Database Adapter:
 * Tries PostgreSQL + PostGIS first; seamlessly falls back to embedded spatial SQLite store.
 */
async function query(text, params = []) {
  if (pgPool && isPgReachable !== false) {
    try {
      const result = await pgPool.query(text, params);
      isPgReachable = true;
      return result;
    } catch (pgErr) {
      if (pgErr.code === 'ENOTFOUND' || pgErr.code === 'ECONNREFUSED' || pgErr.message.includes('timeout')) {
        if (isPgReachable !== false) {
          logger.warn(`PostgreSQL unreachable (${pgErr.message}). Seamlessly engaging embedded spatial SQLite database.`);
          isPgReachable = false;
        }
      } else {
        // If it's a specific SQL syntax error in PG, throw it
        throw pgErr;
      }
    }
  }

  // Fallback to embedded spatial SQLite database
  return runSqliteQuery(text, params);
}

// Minimal event emitter mock for pool.on('connect')
const eventListeners = {};
function on(event, callback) {
  if (!eventListeners[event]) eventListeners[event] = [];
  eventListeners[event].push(callback);
}

module.exports = {
  query,
  on,
  get isPostgresActive() {
    return isPgReachable === true;
  },
};
