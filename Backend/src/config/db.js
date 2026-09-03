const { Pool } = require('pg');
const env = require('./env');

const poolConfig = {};

if (env.databaseUrl) {
  poolConfig.connectionString = env.databaseUrl;
} else {
  if (env.db.user) poolConfig.user = env.db.user;
  if (env.db.host) poolConfig.host = env.db.host;
  if (env.db.database) poolConfig.database = env.db.database;
  if (typeof env.db.password === 'string' && env.db.password.length > 0) {
    poolConfig.password = env.db.password;
  }
  if (env.db.port) poolConfig.port = env.db.port;
}

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

module.exports = pool;