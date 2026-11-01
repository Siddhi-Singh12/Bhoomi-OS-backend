const {
  planDroneMission,
  analyzeDroneImagery,
  fuseSatelliteAndDroneRisk,
  prioritizeVillageFields,
} = require('../services/droneIntelligence.service');
const pool = require('../config/db');
const logger = require('../utils/logger');
const { getFarmById } = require('../models/farm.model');

async function createMission(req, res, next) {
  try {
    const {
      farm_id,
      boundary,
      altitude_m = 60.0,
      side_overlap_pct = 70.0,
      forward_overlap_pct = 80.0,
      speed_ms = 5.0,
      mission_name,
    } = req.body;

    const mission = await planDroneMission({
      farm_id,
      boundary,
      altitude_m,
      side_overlap_pct,
      forward_overlap_pct,
      speed_ms,
      mission_name,
    });

    res.status(201).json({ success: true, mission });
  } catch (err) {
    next(err);
  }
}

async function listMissions(req, res, next) {
  try {
    const q = 'SELECT * FROM drone_missions ORDER BY id DESC;';
    const result = await pool.query(q);
    res.json({
      success: true,
      count: result.rows.length,
      missions: result.rows.map((m) => ({
        ...m,
        target_farm_ids: typeof m.target_farm_ids === 'string' ? JSON.parse(m.target_farm_ids) : m.target_farm_ids,
        planned_flight_path: typeof m.planned_flight_path === 'string' ? JSON.parse(m.planned_flight_path) : m.planned_flight_path,
      })),
    });
  } catch (err) {
    next(err);
  }
}

async function getMission(req, res, next) {
  try {
    const q = 'SELECT * FROM drone_missions WHERE id = $1;';
    const result = await pool.query(q, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Drone mission not found' });
    }
    const m = result.rows[0];
    res.json({
      success: true,
      mission: {
        ...m,
        target_farm_ids: typeof m.target_farm_ids === 'string' ? JSON.parse(m.target_farm_ids) : m.target_farm_ids,
        planned_flight_path: typeof m.planned_flight_path === 'string' ? JSON.parse(m.planned_flight_path) : m.planned_flight_path,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function runCV(req, res, next) {
  try {
    const { farm_id, image_path, mission_id } = req.body;
    if (!farm_id) {
      return res.status(400).json({ success: false, error: 'farm_id is required' });
    }

    const cv = await analyzeDroneImagery({ farm_id, image_path, mission_id });
    res.json({ success: true, cv_analysis: cv });
  } catch (err) {
    next(err);
  }
}

async function runFusion(req, res, next) {
  try {
    const {
      farm_id,
      ndvi,
      ndwi,
      rainfall_mm,
      temperature_c,
      persistence_days,
      drone_stress_fraction,
      crop_type,
    } = req.body;

    const fusion = await fuseSatelliteAndDroneRisk({
      farm_id,
      ndvi,
      ndwi,
      rainfall_mm,
      temperature_c,
      persistence_days,
      drone_stress_fraction,
      crop_type,
    });

    res.json({ success: true, fusion });
  } catch (err) {
    next(err);
  }
}

async function getPrioritization(req, res, next) {
  try {
    const dailyCapacity = parseInt(req.query.daily_capacity || 45, 10);
    const minRisk = parseFloat(req.query.min_risk || 40.0);

    const result = await prioritizeVillageFields({
      daily_capacity: dailyCapacity,
      min_risk_threshold: minRisk,
    });

    res.json({ success: true, prioritization: result });
  } catch (err) {
    next(err);
  }
}

async function processOrthomosaic(req, res, next) {
  try {
    const farmId = parseInt(req.body.farm_id || 1, 10);
    const farm = await getFarmById(farmId);
    if (!farm) {
      return res.status(404).json({ success: false, error: 'Farm not found' });
    }

    const insertQuery = `
      INSERT INTO drone_orthomosaics (
        farm_id, mission_id, status, orthomosaic_url,
        gsd_cm_per_pixel, total_area_ha
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [
      farmId,
      req.body.mission_id || null,
      'COMPLETED',
      `/proofs/orthomosaic_farm_${farmId}.png`,
      1.64,
      farm.area_hectares || 2.35,
    ];

    const dbRes = await pool.query(insertQuery, values);
    res.json({
      success: true,
      orthomosaic: {
        ...dbRes.rows[0],
        engine: 'OpenDroneMap (ODM) Processing Pipeline',
        reprojection_error_px: 0.82,
        processing_status: 'SUCCESS',
        is_calibrated_demo: true,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createMission,
  listMissions,
  getMission,
  runCV,
  runFusion,
  getPrioritization,
  processOrthomosaic,
};
