const pool = require('../config/db');

async function findNearbyFarms(farm_id, radius_km) {
  const query = `
    SELECT id FROM farms
    WHERE ST_DWithin(
      boundary::geography,
      (SELECT boundary FROM farms WHERE id = $1)::geography,
      $2 * 1000
    )
    AND id != $1;
  `;
  const result = await pool.query(query, [farm_id, radius_km]);
  return result.rows.map(row => row.id);
}

async function createAlert({ source_farm_id, alert_type, radius_km, affected_farm_ids, message }) {
  const query = `
    INSERT INTO alerts (source_farm_id, alert_type, radius_km, affected_farm_ids, message)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const values = [source_farm_id, alert_type, radius_km, affected_farm_ids, message];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function getAlertById(id) {
  const result = await pool.query('SELECT * FROM alerts WHERE id = $1', [id]);
  return result.rows[0];
}

module.exports = { findNearbyFarms, createAlert, getAlertById };