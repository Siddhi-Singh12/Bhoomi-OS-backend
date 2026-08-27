const pool = require('../config/db');
const { normalizeToGeoJSONPolygon, calculateCentroid } = require('../utils/geoUtils');

async function createFarm({ farmer_id, crop_type, boundary, location_name, state }) {
  const normalizedGeoJSON = normalizeToGeoJSONPolygon(boundary);
  const geojsonString = JSON.stringify(normalizedGeoJSON);

  const query = `
    INSERT INTO farms (farmer_id, crop_type, area_hectares, boundary)
    VALUES (
      $1,
      $2,
      ROUND((ST_Area(ST_GeomFromGeoJSON($3)::geography) / 10000)::numeric, 2),
      ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)
    )
    RETURNING id, farmer_id, crop_type, area_hectares, ST_AsGeoJSON(boundary) AS boundary, created_at;
  `;
  const values = [farmer_id, crop_type || 'Unknown', geojsonString];
  const result = await pool.query(query, values);
  const farm = result.rows[0];

  return {
    ...farm,
    boundary: typeof farm.boundary === 'string' ? JSON.parse(farm.boundary) : farm.boundary,
  };
}

async function getFarmById(id) {
  const query = `
    SELECT 
      f.id,
      f.farmer_id,
      fm.name AS farmer_name,
      fm.agristack_id,
      fm.phone AS farmer_phone,
      f.crop_type,
      f.area_hectares,
      ST_AsGeoJSON(f.boundary) AS boundary,
      f.created_at
    FROM farms f
    LEFT JOIN farmers fm ON fm.id = f.farmer_id
    WHERE f.id = $1;
  `;
  const result = await pool.query(query, [id]);
  if (result.rows.length === 0) return null;
  const farm = result.rows[0];
  return {
    ...farm,
    boundary: typeof farm.boundary === 'string' ? JSON.parse(farm.boundary) : farm.boundary,
  };
}

async function getAllFarms(farmer_id = null) {
  let query = `
    SELECT 
      f.id,
      f.farmer_id,
      fm.name AS farmer_name,
      fm.agristack_id,
      f.crop_type,
      f.area_hectares,
      ST_AsGeoJSON(f.boundary) AS boundary,
      f.created_at
    FROM farms f
    LEFT JOIN farmers fm ON fm.id = f.farmer_id
  `;
  const values = [];
  if (farmer_id) {
    query += ` WHERE f.farmer_id = $1`;
    values.push(farmer_id);
  }
  query += ` ORDER BY f.id DESC;`;

  const result = await pool.query(query, values);
  return result.rows.map((row) => ({
    ...row,
    boundary: typeof row.boundary === 'string' ? JSON.parse(row.boundary) : row.boundary,
  }));
}

async function getFarmCentroid(farm_id) {
  const query = `
    SELECT
      ROUND(ST_Y(ST_Centroid(boundary))::numeric, 6) AS lat,
      ROUND(ST_X(ST_Centroid(boundary))::numeric, 6) AS lng
    FROM farms WHERE id = $1;
  `;
  const result = await pool.query(query, [farm_id]);
  if (result.rows.length === 0) return null;
  return {
    lat: parseFloat(result.rows[0].lat),
    lng: parseFloat(result.rows[0].lng),
  };
}

module.exports = {
  createFarm,
  getFarmById,
  getAllFarms,
  getFarmCentroid,
};