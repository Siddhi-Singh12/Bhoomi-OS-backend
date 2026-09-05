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

/**
 * Returns complete cadastral and agronomic metadata for holdings
 * falling within the geodesic radius of the source farm.
 */
async function getNearbyFarmsDetails(farm_id, radius_km = 2) {
  const query = `
    SELECT 
      f.id,
      f.farmer_id,
      fm.name AS farmer_name,
      fm.phone AS farmer_phone,
      fm.agristack_id,
      f.crop_type,
      ROUND(f.area_hectares::numeric, 2) AS area_hectares,
      ST_AsGeoJSON(f.boundary) AS boundary,
      ROUND(ST_Y(ST_Centroid(f.boundary))::numeric, 6) AS lat,
      ROUND(ST_X(ST_Centroid(f.boundary))::numeric, 6) AS lng,
      ROUND(ST_Distance(f.boundary::geography, (SELECT boundary FROM farms WHERE id = $1)::geography)::numeric, 1) AS distance_meters
    FROM farms f
    LEFT JOIN farmers fm ON fm.id = f.farmer_id
    WHERE ST_DWithin(
      f.boundary::geography,
      (SELECT boundary FROM farms WHERE id = $1)::geography,
      $2 * 1000
    )
    AND f.id != $1
    ORDER BY distance_meters ASC;
  `;
  const result = await pool.query(query, [farm_id, radius_km]);
  return result.rows.map((row) => ({
    ...row,
    lat: row.lat != null ? parseFloat(row.lat) : null,
    lng: row.lng != null ? parseFloat(row.lng) : null,
    distance_meters: row.distance_meters != null ? parseFloat(row.distance_meters) : null,
    area_hectares: row.area_hectares != null ? parseFloat(row.area_hectares) : null,
    boundary: typeof row.boundary === 'string' ? JSON.parse(row.boundary) : row.boundary,
  }));
}

async function createAlert({ source_farm_id, alert_type, radius_km = 2, affected_farm_ids = [], message }) {
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
      f.area_hectares,
      fm.name AS farmer_name,
      fm.phone AS farmer_phone,
      fm.agristack_id,
      ST_AsGeoJSON(f.boundary) AS source_boundary,
      ROUND(ST_Y(ST_Centroid(f.boundary))::numeric, 6) AS lat,
      ROUND(ST_X(ST_Centroid(f.boundary))::numeric, 6) AS lng
    FROM alerts a
    LEFT JOIN farms f ON f.id = a.source_farm_id
    LEFT JOIN farmers fm ON fm.id = f.farmer_id
    WHERE a.id = $1;
  `;
  const result = await pool.query(query, [id]);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  const parsedBoundary = typeof row.source_boundary === 'string' ? JSON.parse(row.source_boundary) : row.source_boundary;
  let nearbyFarms = [];
  try {
    nearbyFarms = await getNearbyFarmsDetails(row.source_farm_id, row.radius_km || 2);
  } catch (e) {
    nearbyFarms = [];
  }

  return {
    ...row,
    lat: row.lat != null ? parseFloat(row.lat) : null,
    lng: row.lng != null ? parseFloat(row.lng) : null,
    source_boundary: parsedBoundary,
    nearbyFarms,
  };
}

async function getAlertsByFarmId(farm_id) {
  const query = `
    SELECT 
      a.*,
      f.crop_type,
      f.area_hectares,
      fm.name AS farmer_name,
      fm.phone AS farmer_phone,
      fm.agristack_id,
      ST_AsGeoJSON(f.boundary) AS source_boundary,
      ROUND(ST_Y(ST_Centroid(f.boundary))::numeric, 6) AS lat,
      ROUND(ST_X(ST_Centroid(f.boundary))::numeric, 6) AS lng
    FROM alerts a
    LEFT JOIN farms f ON f.id = a.source_farm_id
    LEFT JOIN farmers fm ON fm.id = f.farmer_id
    WHERE a.source_farm_id = $1
    ORDER BY a.created_at DESC;
  `;
  const result = await pool.query(query, [farm_id]);
  return result.rows.map((row) => ({
    ...row,
    lat: row.lat != null ? parseFloat(row.lat) : null,
    lng: row.lng != null ? parseFloat(row.lng) : null,
    source_boundary: typeof row.source_boundary === 'string' ? JSON.parse(row.source_boundary) : row.source_boundary,
  }));
}

async function getAlertsByFarmerId(farmer_id) {
  const query = `
    SELECT 
      a.*,
      f.crop_type,
      f.area_hectares,
      fm.name AS farmer_name,
      fm.phone AS farmer_phone,
      fm.agristack_id,
      ST_AsGeoJSON(f.boundary) AS source_boundary,
      ROUND(ST_Y(ST_Centroid(f.boundary))::numeric, 6) AS lat,
      ROUND(ST_X(ST_Centroid(f.boundary))::numeric, 6) AS lng
    FROM alerts a
    JOIN farms f ON f.id = a.source_farm_id
    LEFT JOIN farmers fm ON fm.id = f.farmer_id
    WHERE f.farmer_id = $1
    ORDER BY a.created_at DESC;
  `;
  const result = await pool.query(query, [farmer_id]);
  return result.rows.map((row) => ({
    ...row,
    lat: row.lat != null ? parseFloat(row.lat) : null,
    lng: row.lng != null ? parseFloat(row.lng) : null,
    source_boundary: typeof row.source_boundary === 'string' ? JSON.parse(row.source_boundary) : row.source_boundary,
  }));
}

async function getAllAlerts() {
  const query = `
    SELECT 
      a.*,
      f.crop_type,
      fm.name AS farmer_name,
      fm.phone AS farmer_phone,
      ST_AsGeoJSON(f.boundary) AS source_boundary,
      ROUND(ST_Y(ST_Centroid(f.boundary))::numeric, 6) AS lat,
      ROUND(ST_X(ST_Centroid(f.boundary))::numeric, 6) AS lng
    FROM alerts a
    LEFT JOIN farms f ON f.id = a.source_farm_id
    LEFT JOIN farmers fm ON fm.id = f.farmer_id
    ORDER BY a.created_at DESC;
  `;
  const result = await pool.query(query);
  return result.rows.map((row) => ({
    ...row,
    lat: row.lat != null ? parseFloat(row.lat) : null,
    lng: row.lng != null ? parseFloat(row.lng) : null,
    source_boundary: typeof row.source_boundary === 'string' ? JSON.parse(row.source_boundary) : row.source_boundary,
  }));
}

module.exports = {
  findNearbyFarms,
  getNearbyFarmsDetails,
  createAlert,
  getAlertById,
  getAlertsByFarmId,
  getAlertsByFarmerId,
  getAllAlerts,
};