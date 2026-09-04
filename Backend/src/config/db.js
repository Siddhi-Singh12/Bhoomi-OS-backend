const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.db.connectionString,
  ssl: { rejectUnauthorized: false },
});

pool.on('connect', () => {
  console.log('Connected to Supabase (bhoomi_os) database');
});

module.exports = pool;