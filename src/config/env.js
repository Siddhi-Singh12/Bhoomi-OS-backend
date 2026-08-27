require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5001,
  databaseUrl: process.env.DATABASE_URL,
  db: {
    connectionString: process.env.DATABASE_URL,
    user: process.env.DB_USER,
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'bhoomi_os',
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
  },
  stressEngineUrl: process.env.STRESS_ENGINE_URL || 'http://127.0.0.1:8000',
  sentinel: {
    clientId: process.env.SENTINEL_CLIENT_ID,
    clientSecret: process.env.SENTINEL_CLIENT_SECRET,
  },
  jwtSecret: process.env.JWT_SECRET || 'bhoomi-os-secret-key-2026',
};