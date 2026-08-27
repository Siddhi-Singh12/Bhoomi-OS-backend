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
    const { farm_id, ndvi_baseline } = req.body;

    const farm = await getFarmById(farm_id);
    if (!farm) {
      return res.status(404).json({ success: false, error: 'Farm not found' });
    }

    const centroid = (await getFarmCentroid(farm_id)) || { lat: 21.821, lng: 75.612 };
    const boundaryCoordinates = farm.boundary.coordinates;

    let evaluation = null;

    // 1. Try Python Rules Engine (GEE + Open-Meteo)
    const pythonResult = await callPythonRulesEngine(boundaryCoordinates, ndvi_baseline || 0.5);

    if (pythonResult && pythonResult.signals.ndvi != null) {
      evaluation = pythonResult;
    } else {
      // 2. Local Fallback Orchestration
      logger.info(`Running local fallback pipeline for farm ${farm_id}`);
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

    // 3. Store Analysis in Database
    const analysisRecord = await createAnalysis({
      farm_id,
      ndvi: evaluation.signals.ndvi,
      ndwi: evaluation.signals.ndwi,
      rainfall_mm: evaluation.signals.rainfall_mm,
      temperature_c: evaluation.signals.temperature_c,
      stress_type: evaluation.stress_type,
      confidence: evaluation.confidence,
      rule_triggered: evaluation.rule_triggered,
    });

    // 4. Spatial PostGIS Nearby-Farm Alerts (if Drought)
    let alert = null;
    if (evaluation.stress_type === 'DROUGHT') {
      const nearbyFarmIds = await findNearbyFarms(farm_id, 2);
      if (nearbyFarmIds.length > 0) {
        alert = await createAlert({
          source_farm_id: farm_id,
          alert_type: 'VILLAGE_LEVEL_DROUGHT',
          radius_km: 2,
          affected_farm_ids: nearbyFarmIds,
          message: `Drought detected on farm ${farm_id} (${farm.crop_type || 'Crops'}). ${nearbyFarmIds.length} nearby farm(s) within 2km may be affected.`,
        });
        logger.info(`Triggered village alert for farm ${farm_id}: ${nearbyFarmIds.length} nearby farms affected.`);
      }
    }

    // 5. Build Decision Card
    const enrichedAnalysis = await getAnalysisById(analysisRecord.id);
    const decisionCard = buildDecisionCard(enrichedAnalysis || { ...analysisRecord, ...farm });

    res.status(201).json({
      success: true,
      analysis: enrichedAnalysis || analysisRecord,
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