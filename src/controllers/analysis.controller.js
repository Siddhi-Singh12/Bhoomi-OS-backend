const { createAnalysis, getAnalysisById } = require('../models/analysis.model');
const { getFarmById, getFarmCentroid } = require('../models/farm.model');
const { evaluateStress } = require('../services/rulesEngine.service');
const { fetchNdviNdwi } = require('../services/satellite.service');
const { fetchWeather } = require('../services/weather.service');
const { findNearbyFarms, createAlert } = require('../models/alert.model');

async function runAnalysis(req, res) {
  try {
    const { farm_id } = req.body;

    if (!farm_id) {
      return res.status(400).json({ success: false, error: 'farm_id is required' });
    }

    const farm = await getFarmById(farm_id);
    if (!farm) {
      return res.status(404).json({ success: false, error: 'Farm not found' });
    }

    const centroid = await getFarmCentroid(farm_id);
    const boundaryGeoJSON = JSON.parse(farm.boundary);

    const [{ ndvi, ndwi }, { rainfall_mm, temperature_c }] = await Promise.all([
      fetchNdviNdwi(boundaryGeoJSON),
      fetchWeather(centroid.lat, centroid.lng),
    ]);

    const { stress_type, rule_triggered, confidence } = evaluateStress({ ndvi, ndwi, rainfall_mm, temperature_c });

    const analysis = await createAnalysis({
      farm_id, ndvi, ndwi, rainfall_mm, temperature_c, stress_type, confidence, rule_triggered
    });

    let alert = null;
    if (stress_type === 'DROUGHT') {
      const nearbyFarmIds = await findNearbyFarms(farm_id, 2);
      alert = await createAlert({
        source_farm_id: farm_id,
        alert_type: 'VILLAGE_LEVEL_DROUGHT',
        radius_km: 2,
        affected_farm_ids: nearbyFarmIds,
        message: `Drought detected on farm ${farm_id}. ${nearbyFarmIds.length} nearby farm(s) within 2km may be affected.`,
      });
    }

    res.status(201).json({ success: true, analysis, alert });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(404).json({ success: false, error: 'farm_id does not exist' });
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
    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { runAnalysis, fetchAnalysis };