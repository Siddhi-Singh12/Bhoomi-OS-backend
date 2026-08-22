const pool = require('../config/db');

async function createFarm({ farmer_id, crop_type, boundary }) {
  const query = `
    INSERT INTO farms (farmer_id, crop_type, area_hectares, boundary)
    VALUES ($1, $2, ST_Area(ST_GeomFromGeoJSON($3)::geography) / 10000, ST_GeomFromGeoJSON($3))
    RETURNING id, farmer_id, crop_type, area_hectares, ST_AsGeoJSON(boundary) AS boundary, created_at;
  `;
  const values = [farmer_id, crop_type, JSON.stringify(boundary)];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function getFarmById(id) {
  const query = `
    SELECT id, farmer_id, crop_type, area_hectares, ST_AsGeoJSON(boundary) AS boundary, created_at
    FROM farms WHERE id = $1;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

async function getFarmCentroid(farm_id) {
  const query = `
    SELECT
      ST_Y(ST_Centroid(boundary)) AS lat,
      ST_X(ST_Centroid(boundary)) AS lng
    FROM farms WHERE id = $1;
  `;
  const result = await pool.query(query, [farm_id]);
  return result.rows[0]; // { lat, lng }
}

module.exports = { createFarm, getFarmById, getFarmCentroid };