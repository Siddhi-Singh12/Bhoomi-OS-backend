const env = require('../config/env');

const STRESS_SERVICE_BASE_URL = process.env.STRESS_ENGINE_URL || env.stressEngineUrl || 'https://bhoomi-os-stress-detection.onrender.com';

function normalizeStressType(type) {
  const map = { drought: 'DROUGHT', pest_risk: 'PEST_RISK', none: 'NONE', unknown: 'NONE' };
  return map[type] || 'NONE';
}

/**
 * Calculates a transparent, deterministic 0-100 agronomic risk score
 * based on detected stress, model confidence, NDVI deficit, and weather telemetry.
 */
function calculateRiskScore(stressType, confidence, ndvi, rainfallMm, temperatureC) {
  const normType = normalizeStressType(stressType);
  const conf = confidence != null ? Number(confidence) : 0.75;
  let score = 15;
  let level = 'LOW';
  const whyFlagged = [];

  if (normType === 'DROUGHT') {
    // Severe drought risk: range 72 - 96
    const baseWeight = 40;
    const confScore = conf * 25; // up to 25
    let ndviScore = 20;
    if (ndvi != null) {
      const deficitPct = Math.max(0, (0.50 - ndvi) / 0.50);
      ndviScore = Math.min(25, deficitPct * 30);
      whyFlagged.push(`Vegetation index (NDVI: ${Number(ndvi).toFixed(2)}) is ${Math.round(deficitPct * 100)}% below expected healthy baseline (0.50)`);
    } else {
      whyFlagged.push('Significant vegetative moisture desiccation detected via satellite reflectance');
    }

    let rainScore = 10;
    if (rainfallMm != null) {
      if (rainfallMm < 10) {
        rainScore = Math.min(15, ((10 - rainfallMm) / 10) * 15);
        whyFlagged.push(`Severe rainfall deficit: ${Number(rainfallMm).toFixed(1)}mm in the past 7 days (critical threshold: <10mm)`);
      } else {
        whyFlagged.push(`Recent rainfall: ${Number(rainfallMm).toFixed(1)}mm over 7 days`);
      }
    }

    if (temperatureC != null && temperatureC > 35) {
      whyFlagged.push(`Thermal stress: elevated average max temperature of ${Number(temperatureC).toFixed(1)}°C accelerating crop desiccation`);
    }

    score = Math.round(baseWeight + confScore + ndviScore + rainScore);
    score = Math.min(98, Math.max(72, score));
    level = 'HIGH';
  } else if (normType === 'PEST_RISK') {
    // Pest risk: range 50 - 74
    const baseWeight = 30;
    const confScore = conf * 25;
    let ndviScore = 15;
    if (ndvi != null) {
      const deficitPct = Math.max(0, (0.50 - ndvi) / 0.50);
      ndviScore = Math.min(20, deficitPct * 25);
      whyFlagged.push(`Biomass stress: NDVI (${Number(ndvi).toFixed(2)}) shows anomalous canopy loss`);
    }
    whyFlagged.push('Canopy moisture (NDWI) and precipitation remain stable while NDVI drops, matching pest/disease infestation patterns');

    score = Math.round(baseWeight + confScore + ndviScore);
    score = Math.min(74, Math.max(50, score));
    level = 'MEDIUM';
  } else {
    // Normal: range 5 - 28
    score = Math.round(Math.max(8, Math.min(28, (0.50 - (ndvi || 0.45)) * 30 + 12)));
    level = 'LOW';
    whyFlagged.push('Canopy reflectance (NDVI) and hydrological signals conform to optimal vegetative health thresholds');
    if (rainfallMm != null) {
      whyFlagged.push(`Adequate moisture received: ${Number(rainfallMm).toFixed(1)}mm 7-day cumulative rainfall`);
    }
  }

  return { risk_score: score, risk_level: level, why_flagged: whyFlagged };
}

/**
 * Calls Person 2's Stress Detection service (satellite + weather + rules,
 * all in one). Replaces our old separate satellite.service.js / weather.service.js.
 */
async function evaluateStress(boundaryGeoJSON, demoScenario = null) {
  try {
    let data;

    if (demoScenario) {
      const response = await axios.get(`${STRESS_SERVICE_BASE_URL}/demo/${demoScenario}`, { timeout: 30000 });
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

      const response = await axios.post(`${STRESS_SERVICE_BASE_URL}/analyze-stress`, requestBody, { timeout: 30000 });
      data = response.data;
    }

    if (data.stress_type === 'error') {
      const err = new Error('Stress detection service returned an error');
      err.code = 'STRESS_SERVICE_ERROR';
      throw err;
    }

    const normStress = normalizeStressType(data.stress_type);
    const ndviVal = data.signals?.ndvi ?? null;
    const ndwiVal = data.signals?.ndwi ?? null;
    const rainfallVal = data.signals?.rainfall_7d_mm ?? null;
    const tempVal = data.signals?.avg_temp_c ?? null;

    const riskAssessment = calculateRiskScore(normStress, data.confidence, ndviVal, rainfallVal, tempVal);

    return {
      stress_type: normStress,
      rule_triggered: data.rule_id,
      confidence: data.confidence,
      ndvi: ndviVal,
      ndwi: ndwiVal,
      rainfall_mm: rainfallVal,
      temperature_c: tempVal,
      explanation: data.explanation,
      satellite_date: data.satellite_date,
      risk_score: riskAssessment.risk_score,
      risk_level: riskAssessment.risk_level,
      why_flagged: riskAssessment.why_flagged,
    };
  } catch (err) {
    console.error('RULES ENGINE SERVICE ERROR:', err.response?.data || err.message);
    const wrapped = new Error('Stress detection service unavailable');
    wrapped.code = 'STRESS_SERVICE_UNAVAILABLE';
    throw wrapped;
  }
}

module.exports = { evaluateStress, calculateRiskScore };