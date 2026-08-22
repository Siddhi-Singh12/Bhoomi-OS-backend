const pool = require('../config/db');

async function createAnalysis({ farm_id, ndvi, ndwi, rainfall_mm, temperature_c, stress_type, confidence, rule_triggered }) {
  const query = `
    INSERT INTO analyses (farm_id, ndvi, ndwi, rainfall_mm, temperature_c, stress_type, confidence, rule_triggered)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;
  const values = [farm_id, ndvi, ndwi, rainfall_mm, temperature_c, stress_type, confidence, rule_triggered];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function getAnalysisById(id) {
  const result = await pool.query('SELECT * FROM analyses WHERE id = $1', [id]);
  return result.rows[0];
}

module.exports = { createAnalysis, getAnalysisById };