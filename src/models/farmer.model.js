const pool = require('../config/db');

async function createFarmer({ name, phone, language, agristack_id }) {
  const query = `
    INSERT INTO farmers (name, phone, language, agristack_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const values = [name, phone, language || 'hi', agristack_id || null];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function getFarmerById(id) {
  const result = await pool.query('SELECT * FROM farmers WHERE id = $1', [id]);
  return result.rows[0];
}

module.exports = { createFarmer, getFarmerById };