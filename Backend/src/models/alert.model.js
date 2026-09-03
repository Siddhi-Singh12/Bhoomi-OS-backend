const pool = require('../config/db');

async function findNearbyFarms(farm_id, radius_km = 2) {
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
  return result.rows.map((row) => row.id);
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
  const query = `
    SELECT 
      a.*,
      f.crop_type,
      fm.name AS farmer_name
    FROM alerts a
    LEFT JOIN farms f ON f.id = a.source_farm_id
    LEFT JOIN farmers fm ON fm.id = f.farmer_id
    WHERE a.id = $1;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

async function getAllAlerts() {
  const query = `
    SELECT 
      a.*,
      f.crop_type,
      fm.name AS farmer_name
    FROM alerts a
    LEFT JOIN farms f ON f.id = a.source_farm_id
    LEFT JOIN farmers fm ON fm.id = f.farmer_id
    ORDER BY a.created_at DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
}

module.exports = { findNearbyFarms, createAlert, getAlertById, getAllAlerts };