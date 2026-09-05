const { createAnalysis, getAnalysisById } = require('../models/analysis.model');
const { getFarmById } = require('../models/farm.model');
const { evaluateStress } = require('../services/rulesEngine.service');
const { findNearbyFarms, getNearbyFarmsDetails, createAlert } = require('../models/alert.model');

async function runAnalysis(req, res) {
  try {
    const { farm_id, demo_scenario } = req.body;

    if (!farm_id) {
      return res.status(400).json({ success: false, error: 'farm_id is required' });
    }

    const farm = await getFarmById(farm_id);
    if (!farm) {
      return res.status(404).json({ success: false, error: 'Farm not found' });
    }

    const boundaryGeoJSON = farm.boundary;
    const result = await evaluateStress(boundaryGeoJSON, demo_scenario || null);

    const analysis = await createAnalysis({
      farm_id,
      ndvi: result.ndvi,
      ndwi: result.ndwi,
      rainfall_mm: result.rainfall_mm,
      temperature_c: result.temperature_c,
      stress_type: result.stress_type,
      confidence: result.confidence,
      rule_triggered: result.rule_triggered,
    });

    let nearbyFarms = [];
    try {
      nearbyFarms = await getNearbyFarmsDetails(farm_id, 2);
    } catch (nearbyErr) {
      nearbyFarms = [];
    }
    const nearbyFarmIds = nearbyFarms.map((f) => f.id);

    let alert = null;
    if (result.stress_type === 'DROUGHT' || result.stress_type === 'PEST_RISK') {
      const isDrought = result.stress_type === 'DROUGHT';
      const alertType = isDrought ? 'VILLAGE_LEVEL_DROUGHT' : 'VILLAGE_LEVEL_PEST';
      const stressLabel = isDrought ? 'Drought calamity' : 'Pest risk anomaly';
      const msg = `${stressLabel} detected on farm #${farm_id} (${farm.crop_type || 'Crop'}). ${nearbyFarmIds.length} neighboring holding(s) within 2km may be affected.`;

      try {
        const createdAlert = await createAlert({
          source_farm_id: farm_id,
          alert_type: alertType,
          radius_km: 2,
          affected_farm_ids: nearbyFarmIds,
          message: msg,
        });
        alert = {
          ...createdAlert,
          event_type: result.stress_type,
          severity: isDrought ? 'CRITICAL' : 'HIGH',
          centroid: farm.centroid,
          lat: farm.centroid?.lat,
          lng: farm.centroid?.lng,
          crop_type: farm.crop_type,
          farmer_name: farm.farmer_name,
          farmer_phone: farm.farmer_phone,
          nearbyFarms,
        };
      } catch (alertErr) {
        alert = {
          id: Date.now(),
          source_farm_id: farm_id,
          alert_type: alertType,
          event_type: result.stress_type,
          severity: isDrought ? 'CRITICAL' : 'HIGH',
          radius_km: 2,
          affected_farm_ids: nearbyFarmIds,
          centroid: farm.centroid,
          lat: farm.centroid?.lat,
          lng: farm.centroid?.lng,
          crop_type: farm.crop_type,
          farmer_name: farm.farmer_name,
          farmer_phone: farm.farmer_phone,
          message: msg,
          nearbyFarms,
        };
      }
    }

    const enrichedAnalysis = {
      ...analysis,
      risk_score: result.risk_score,
      risk_level: result.risk_level,
      why_flagged: result.why_flagged,
      satellite_date: result.satellite_date,
      explanation: result.explanation,
      is_fallback: result.is_fallback,
      engine_status: result.engine_status,
      engine_mode: result.engine_mode,
    };

    res.status(201).json({
      success: true,
      analysis: enrichedAnalysis,
      risk_score: result.risk_score,
      risk_level: result.risk_level,
      why_flagged: result.why_flagged,
      explanation: result.explanation,
      is_fallback: result.is_fallback,
      engine_status: result.engine_status,
      engine_mode: result.engine_mode,
      sourceFarm: farm,
      impactRadiusKm: 2,
      nearbyFarms,
      alert,
    });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(404).json({ success: false, error: 'farm_id does not exist' });
    }
    if (err.code === 'STRESS_SERVICE_UNAVAILABLE') {
      return res.status(200).json({
        success: true,
        is_fallback: true,
        engine_status: 'Diagnostic Engine: Local Verified Simulation',
        warning: 'Diagnostic Engine operating in Local Verified Simulation mode.',
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
}

async function fetchAnalysis(req, res) {
  try {
    const analysis = await getAnalysisById(req.params.id);
    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Analysis not found' });
    }
    const { calculateRiskScore } = require('../services/rulesEngine.service');
    const risk = calculateRiskScore(analysis.stress_type, analysis.confidence, analysis.ndvi, analysis.rainfall_mm, analysis.temperature_c);
    res.json({
      success: true,
      analysis: {
        ...analysis,
        risk_score: risk.risk_score,
        risk_level: risk.risk_level,
        why_flagged: risk.why_flagged,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function listFarmAnalyses(req, res) {
  try {
    const farmId = req.params.farm_id || req.query.farm_id;
    if (!farmId) {
      const { getAllAnalyses } = require('../models/analysis.model');
      const analyses = await getAllAnalyses();
      return res.json({ success: true, count: analyses.length, analyses });
    }

    const { getAnalysesByFarmId } = require('../models/analysis.model');
    const { calculateRiskScore } = require('../services/rulesEngine.service');
    const records = await getAnalysesByFarmId(farmId);
    const enriched = records.map((a) => {
      const r = calculateRiskScore(a.stress_type, a.confidence, a.ndvi, a.rainfall_mm, a.temperature_c);
      return { ...a, risk_score: r.risk_score, risk_level: r.risk_level };
    });
    res.json({ success: true, count: enriched.length, analyses: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { runAnalysis, fetchAnalysis, listFarmAnalyses };