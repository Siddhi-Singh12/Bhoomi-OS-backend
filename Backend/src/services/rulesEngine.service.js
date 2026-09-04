const axios = require('axios');

const STRESS_SERVICE_BASE_URL = 'https://bhoomi-os-stress-detection.onrender.com';

function normalizeStressType(type) {
  const map = { drought: 'DROUGHT', pest_risk: 'PEST_RISK', none: 'NONE', unknown: 'NONE' };
  return map[type] || 'NONE';
}

/**
 * Calls Person 2's Stress Detection service (satellite + weather + rules,
 * all in one). Replaces our old separate satellite.service.js / weather.service.js.
 */
async function evaluateStress(boundaryGeoJSON, demoScenario = null) {
  try {
    let data;

    if (demoScenario) {
      const response = await axios.get(`${STRESS_SERVICE_BASE_URL}/demo/${demoScenario}`, { timeout: 15000 });
      data = response.data;
    } else {
      const today = new Date();
      const fromDate = new Date(today);
      fromDate.setDate(today.getDate() - 30);

      const requestBody = {
        coordinates: boundaryGeoJSON.coordinates,
        start_date: fromDate.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0],
      };

      const response = await axios.post(`${STRESS_SERVICE_BASE_URL}/analyze-stress`, requestBody, { timeout: 15000 });
      data = response.data;
    }

    if (data.stress_type === 'error') {
      const err = new Error('Stress detection service returned an error');
      err.code = 'STRESS_SERVICE_ERROR';
      throw err;
    }

    return {
      stress_type: normalizeStressType(data.stress_type),
      rule_triggered: data.rule_id,
      confidence: data.confidence,
      ndvi: data.signals?.ndvi ?? null,
      ndwi: data.signals?.ndwi ?? null,
      rainfall_mm: data.signals?.rainfall_7d_mm ?? null,
      temperature_c: data.signals?.avg_temp_c ?? null,
      explanation: data.explanation,
      satellite_date: data.satellite_date,
    };
  } catch (err) {
    console.error('RULES ENGINE SERVICE ERROR:', err.response?.data || err.message);
    const wrapped = new Error('Stress detection service unavailable');
    wrapped.code = 'STRESS_SERVICE_UNAVAILABLE';
    throw wrapped;
  }
}

async function evaluateStressDemo(scenarioName) {
  try {
    const response = await axios.get(`${STRESS_SERVICE_BASE_URL}/demo/${scenarioName}`, {
      timeout: 15000,
    });
    const data = response.data;
    return {
      stress_type: normalizeStressType(data.stress_type),
      rule_triggered: data.rule_id,
      confidence: data.confidence,
      ndvi: data.signals?.ndvi ?? null,
      ndwi: data.signals?.ndwi ?? null,
      rainfall_mm: data.signals?.rainfall_7d_mm ?? null,
      temperature_c: data.signals?.avg_temp_c ?? null,
      explanation: data.explanation,
      satellite_date: data.satellite_date,
    };
  } catch (err) {
    console.error('DEMO SCENARIO ERROR:', err.message);
    const wrapped = new Error('Demo scenario unavailable');
    wrapped.code = 'STRESS_SERVICE_UNAVAILABLE';
    throw wrapped;
  }
}

module.exports = { evaluateStress,evaluateStressDemo};