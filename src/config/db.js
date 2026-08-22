const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool(env.db);

pool.on('connect', () => {
  console.log('Connected to bhoomi_os database');
});

module.exports = pool;