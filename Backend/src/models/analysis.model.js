const pool = require('../config/db');

async function createAnalysis({
  farm_id,
  ndvi,
  ndwi,
  rainfall_mm,
  temperature_c,
  stress_type,
  confidence,
  rule_triggered,
}) {
  const query = `
    INSERT INTO analyses (farm_id, ndvi, ndwi, rainfall_mm, temperature_c, stress_type, confidence, rule_triggered)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;
  const values = [
    farm_id,
    ndvi != null ? Number(ndvi) : null,
    ndwi != null ? Number(ndwi) : null,
    rainfall_mm != null ? Number(rainfall_mm) : null,
    temperature_c != null ? Number(temperature_c) : null,
    stress_type,
    confidence != null ? Number(confidence) : 0.75,
    rule_triggered,
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function getAnalysisById(id) {
  const query = `
    SELECT 
      a.*,
      f.crop_type,
      f.area_hectares,
      ST_AsGeoJSON(f.boundary) AS boundary,
      fm.id AS farmer_id,
      fm.name AS farmer_name,
      fm.phone AS farmer_phone,
      fm.agristack_id
    FROM analyses a
    JOIN farms f ON f.id = a.farm_id
    JOIN farmers fm ON fm.id = f.farmer_id
    WHERE a.id = $1;
  `;
  const result = await pool.query(query, [id]);
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    ...row,
    boundary: typeof row.boundary === 'string' ? JSON.parse(row.boundary) : row.boundary,
  };
}

async function getAnalysesByFarmId(farm_id) {
  const query = `
    SELECT 
      a.*,
      f.crop_type,
      f.area_hectares
    FROM analyses a
    JOIN farms f ON f.id = a.farm_id
    WHERE a.farm_id = $1
    ORDER BY a.analyzed_at DESC;
  `;
  const result = await pool.query(query, [farm_id]);
  return result.rows;
}

async function getAllAnalyses() {
  const query = `
    SELECT 
      a.*,
      f.crop_type,
      f.area_hectares,
      fm.name AS farmer_name
    FROM analyses a
    JOIN farms f ON f.id = a.farm_id
    JOIN farmers fm ON fm.id = f.farmer_id
    ORDER BY a.analyzed_at DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
}

module.exports = {
  createAnalysis,
  getAnalysisById,
  getAnalysesByFarmId,
  getAllAnalyses,
};