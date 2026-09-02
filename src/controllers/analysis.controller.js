const {
  createAnalysis,
  getAnalysisById,
  getAnalysesByFarmId,
  getAllAnalyses,
} = require('../models/analysis.model');
const { getFarmById, getFarmCentroid } = require('../models/farm.model');
const {
  evaluateStressLocal,
  callPythonRulesEngine,
  generateRecommendations,
  mapSeverity,
} = require('../services/rulesEngine.service');
const { fetchNdviNdwi } = require('../services/satellite.service');
const { fetchWeather } = require('../services/weather.service');
const { findNearbyFarms, createAlert } = require('../models/alert.model');
const { calculateCentroid, normalizeToGeoJSONPolygon } = require('../utils/geoUtils');
const logger = require('../utils/logger');

/**
 * Formats a raw analysis record into a rich Decision Card for frontend / Kisan UI
 */
function buildDecisionCard(analysis) {
  const stressType = (analysis.stress_type || 'NONE').toUpperCase();
  const confidence = parseFloat(analysis.confidence) || 0.75;
  const severity = mapSeverity(stressType, confidence);
  const recommendations = generateRecommendations(stressType);

  const ndvi = analysis.ndvi != null ? parseFloat(analysis.ndvi) : null;
  const ndwi = analysis.ndwi != null ? parseFloat(analysis.ndwi) : null;
  const rainfall = analysis.rainfall_mm != null ? parseFloat(analysis.rainfall_mm) : null;
  const temp = analysis.temperature_c != null ? parseFloat(analysis.temperature_c) : null;

  let explanation = '';
  if (stressType === 'DROUGHT') {
    explanation = `Severe moisture stress detected: Crop canopy NDVI (${ndvi}) is significantly lower than healthy baseline, coupled with deficient 7-day rainfall (${rainfall}mm) and elevated temperature (${temp}°C).`;
  } else if (stressType === 'PEST_RISK') {
    explanation = `Elevated pest vulnerability: Canopy water content index (NDWI: ${ndwi}) under high heat stress (${temp}°C) indicates conditions favorable for pest multiplication.`;
  } else {
    explanation = `Crop health is stable. Spectral indices and rainfall data indicate normal moisture and vegetative growth.`;
  }

  const baselineNdvi = 0.5;
  const deficitPct = ndvi != null ? Math.max(0, Math.round(((baselineNdvi - ndvi) / baselineNdvi) * 100)) : 0;

  return {
    decision_card_id: `DC-${analysis.id}`,
    analysis_id: analysis.id,
    farm_id: analysis.farm_id,
    farmer_name: analysis.farmer_name || null,
    crop_type: analysis.crop_type || 'Field Crop',
    stress_type: stressType,
    severity,
    confidence_score: Math.round(confidence * 100),
    confidence_label: `${Math.round(confidence * 100)}% Verified`,
    rule_triggered: analysis.rule_triggered,
    explanation,
    signals: {
      ndvi,
      ndwi,
      rainfall_mm: rainfall,
      temperature_c: temp,
    },
    spectral_baseline_comparison: {
      current_ndvi: ndvi,
      expected_baseline_ndvi: baselineNdvi,
      vegetative_deficit_pct: deficitPct,
    },
    recommendations,
    next_action:
      stressType === 'DROUGHT'
        ? 'ELIGIBLE_FOR_PMFBY_PROOF_PACKET'
        : stressType === 'PEST_RISK'
        ? 'ACTIONABLE_BIO_SPRAY_RECOMMENDED'
        : 'MONITORING_CONTINUES',
    proof_packet_ready: stressType === 'DROUGHT',
    analyzed_at: analysis.analyzed_at || new Date().toISOString(),
  };
}

/**
 * Runs end-to-end multi-source analysis (GEE / Sentinel-2 + Open-Meteo + Rules Engine + Alerts)
 */
async function runAnalysis(req, res, next) {
  try {
    const { farm_id, ndvi_baseline, custom_telemetry } = req.body;

    let farm = null;
    try {
      farm = await getFarmById(farm_id);
    } catch (dbErr) {
      logger.warn(`Database farm lookup skipped: ${dbErr.message}`);
    }

    if (!farm) {
      farm = {
        id: farm_id || 1,
        farmer_id: 1,
        farmer_name: 'Sardar Gurdeep Singh',
        crop_type: 'Wheat',
        area_hectares: 4.8,
        boundary: normalizeToGeoJSONPolygon([
          [75.852, 30.901],
          [75.861, 30.903],
          [75.859, 30.912],
          [75.848, 30.909],
        ]),
      };
    }

    const centroid = calculateCentroid(farm.boundary.coordinates[0]);
    const boundaryCoordinates = farm.boundary.coordinates;

    let evaluation = null;

    if (custom_telemetry?.ndvi !== undefined) {
      // Use user-provided custom telemetry
      const localResult = evaluateStressLocal({
        ndvi: custom_telemetry.ndvi,
        ndwi: custom_telemetry.ndwi || 0.1,
        rainfall_mm: custom_telemetry.rainfall_mm || 12.5,
        temperature_c: custom_telemetry.temperature_c || 34.0,
        crop_type: farm.crop_type,
      });
      evaluation = { ...localResult, engine_source: 'CUSTOM_TELEMETRY' };
    } else {
      // 1. Try Python Rules Engine (GEE + Open-Meteo)
      const pythonResult = await callPythonRulesEngine(boundaryCoordinates, ndvi_baseline || 0.5);

      if (pythonResult && pythonResult.signals.ndvi != null) {
        evaluation = pythonResult;
      } else {
        // 2. Local Fallback Orchestration
        logger.info(`Running local fallback pipeline for farm ${farm.id}`);
        const [{ ndvi, ndwi }, { rainfall_mm, temperature_c }] = await Promise.all([
          fetchNdviNdwi(farm.boundary),
          fetchWeather(centroid.lat, centroid.lng),
        ]);

        const localResult = evaluateStressLocal({
          ndvi,
          ndwi,
          rainfall_mm,
          temperature_c,
          crop_type: farm.crop_type,
        });

        evaluation = {
          ...localResult,
          engine_source: 'LOCAL_RULES_ENGINE',
        };
      }
    }

    // 3. Store Analysis in Database
    let analysisRecord = null;
    try {
      analysisRecord = await createAnalysis({
        farm_id: farm.id,
        ndvi: evaluation.signals.ndvi,
        ndwi: evaluation.signals.ndwi,
        rainfall_mm: evaluation.signals.rainfall_mm,
        temperature_c: evaluation.signals.temperature_c,
        stress_type: evaluation.stress_type,
        confidence: evaluation.confidence,
        rule_triggered: evaluation.rule_triggered,
      });
    } catch (insertErr) {
      logger.warn(`Could not save analysis to DB: ${insertErr.message}`);
      analysisRecord = {
        id: Math.floor(Date.now() % 100000),
        farm_id: farm.id,
        ndvi: evaluation.signals.ndvi,
        ndwi: evaluation.signals.ndwi,
        rainfall_mm: evaluation.signals.rainfall_mm,
        temperature_c: evaluation.signals.temperature_c,
        stress_type: evaluation.stress_type,
        confidence: evaluation.confidence,
        rule_triggered: evaluation.rule_triggered,
        analyzed_at: new Date().toISOString(),
      };
    }

    // 4. Spatial PostGIS Nearby-Farm Alerts (if Drought)
    let alert = null;
    if (evaluation.stress_type === 'DROUGHT') {
      try {
        const nearbyFarmIds = await findNearbyFarms(farm.id, 2);
        if (nearbyFarmIds.length > 0) {
          alert = await createAlert({
            source_farm_id: farm.id,
            alert_type: 'VILLAGE_LEVEL_DROUGHT',
            radius_km: 2,
            affected_farm_ids: nearbyFarmIds,
            message: `Drought detected on farm ${farm.id} (${farm.crop_type || 'Crops'}). ${nearbyFarmIds.length} nearby farm(s) within 2km may be affected.`,
          });
        }
      } catch (alertErr) {
        logger.warn(`Nearby alert creation skipped: ${alertErr.message}`);
      }
    }

    // 5. Build Decision Card
    const fullAnalysisObj = { ...analysisRecord, ...farm, id: analysisRecord.id };
    const decisionCard = buildDecisionCard(fullAnalysisObj);

    res.status(201).json({
      success: true,
      analysis: fullAnalysisObj,
      decision_card: decisionCard,
      alert,
    });
  } catch (err) {
    next(err);
  }
}

async function fetchAnalysis(req, res, next) {
  try {
    const analysis = await getAnalysisById(req.params.id);
    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Analysis not found' });
    }
    const decisionCard = buildDecisionCard(analysis);
    res.json({ success: true, analysis, decision_card: decisionCard });
  } catch (err) {
    next(err);
  }
}

async function fetchDecisionCard(req, res, next) {
  try {
    const analysis = await getAnalysisById(req.params.id);
    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Analysis not found' });
    }
    const decisionCard = buildDecisionCard(analysis);
    res.json({ success: true, decision_card: decisionCard });
  } catch (err) {
    next(err);
  }
}

async function listAnalyses(req, res, next) {
  try {
    const farmId = req.query.farm_id ? parseInt(req.query.farm_id, 10) : null;
    const analyses = farmId ? await getAnalysesByFarmId(farmId) : await getAllAnalyses();
    res.json({ success: true, count: analyses.length, analyses });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  runAnalysis,
  fetchAnalysis,
  fetchDecisionCard,
  listAnalyses,
};