const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Local fallback rules engine for Bhoomi OS
 * Used when Python service is offline or for standalone evaluation.
 */
function evaluateStressLocal({ ndvi, ndwi, rainfall_mm, temperature_c, crop_type = 'General' }) {
  let stress_type = 'NONE';
  let rule_triggered = 'R0_no_stress_normal_conditions';
  let confidence = 0.85;
  let severity = 'LOW';
  let explanation = 'NDVI and weather signals are within normal agronomic bounds for the active crop cycle.';
  const recommendations = [
    'Maintain standard irrigation schedule',
    'Routine scouting for seasonal weed growth',
  ];

  if (ndvi < 0.28 && rainfall_mm < 20) {
    stress_type = 'DROUGHT';
    rule_triggered = 'R1_drought_low_ndvi_dry_spell';
    confidence = 0.88;
    severity = 'HIGH';
    explanation = `Severe moisture deficit: NDVI dropped to ${ndvi} (<0.28) and cumulative 7-day rainfall is only ${rainfall_mm}mm with high average temperatures (${temperature_c}°C).`;
    recommendations.length = 0;
    recommendations.push(
      'Activate micro-drip irrigation immediately during evening hours',
      'Apply organic mulch (straw/husks) to conserve root-zone soil moisture',
      'Initiate PMFBY claim filing and submit Proof Packet for localized drought relief'
    );
  } else if (ndwi < 0.15 && temperature_c > 35) {
    stress_type = 'PEST_RISK';
    rule_triggered = 'R2_pest_risk_high_heat_water_stress';
    confidence = 0.80;
    severity = 'MODERATE';
    explanation = `Elevated pest vulnerability: Canopy water index (NDWI: ${ndwi}) combined with sustained high temperatures (${temperature_c}°C) creates high susceptibility to sap-sucking pests and leaf blight.`;
    recommendations.length = 0;
    recommendations.push(
      'Deploy pheromone traps at 5 units/hectare for pest monitoring',
      'Inspect undersides of leaves for whitefly/bollworm nymph colonies',
      'Apply bio-pesticide spray (Neem oil 1500ppm) at early morning'
    );
  }

  return {
    stress_type,
    rule_triggered,
    confidence,
    severity,
    explanation,
    recommendations,
    signals: { ndvi, ndwi, rainfall_mm, temperature_c },
  };
}

/**
 * Calls the Python FastAPI Rules Engine (bhoomi-os-stress-detection)
 * Endpoint: POST /analyze-stress
 */
async function callPythonRulesEngine(coordinates, ndvi_baseline = 0.5) {
  const url = `${env.stressEngineUrl}/analyze-stress`;
  try {
    const response = await axios.post(
      url,
      {
        coordinates,
        start_date: new Date(Date.now() - 86400000 * 45).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        ndvi_baseline,
      },
      { timeout: 10000 }
    );

    const data = response.data;
    const stressTypeUpper = (data.stress_type || 'none').toUpperCase();

    // Map Python response format to standardized Bhoomi OS format
    const recommendations = generateRecommendations(stressTypeUpper);
    const severity = mapSeverity(stressTypeUpper, data.confidence);

    return {
      stress_type: stressTypeUpper,
      rule_triggered: data.rule_id || 'R_PYTHON_ENGINE',
      confidence: data.confidence ?? 0.75,
      severity,
      explanation: data.explanation || 'Processed by Bhoomi Python Rules Engine',
      recommendations,
      signals: {
        ndvi: data.signals?.ndvi ?? null,
        ndwi: data.signals?.ndwi ?? null,
        rainfall_mm: data.signals?.rainfall_7d_mm ?? null,
        temperature_c: data.signals?.avg_temp_c ?? null,
      },
      satellite_date: data.satellite_date,
      cloud_cover_pct: data.cloud_cover_pct,
      engine_source: 'PYTHON_FASTAPI_GEE',
    };
  } catch (err) {
    logger.warn(`Python Rules Engine at ${url} unavailable (${err.message}). Falling back to local rules engine.`);
    return null;
  }
}

/**
 * Fetches pre-compiled demo scenario from Python Rules Engine
 */
async function getPythonDemoScenario(scenarioName) {
  const url = `${env.stressEngineUrl}/demo/${scenarioName}`;
  try {
    const response = await axios.get(url, { timeout: 4000 });
    return response.data;
  } catch (err) {
    logger.warn(`Failed to fetch Python demo scenario "${scenarioName}": ${err.message}`);
    return null;
  }
}

function generateRecommendations(stressType) {
  switch (stressType) {
    case 'DROUGHT':
      return [
        'Activate micro-drip irrigation system immediately',
        'Apply organic mulch to retain residual soil moisture',
        'Schedule early morning watering cycle to prevent evaporation losses',
      ];
    case 'PEST_RISK':
      return [
        'Inspect bollworm and whitefly egg clusters under leaf undersides',
        'Deploy pheromone traps at 5 units per hectare',
        'Consider bio-pesticide spray (Neem oil 1500ppm)',
      ];
    default:
      return [
        'Crop condition healthy. Continue regular soil nutrient management.',
        'Schedule next spectral review in 7 days.',
      ];
  }
}

function mapSeverity(stressType, confidence = 0.5) {
  if (stressType === 'DROUGHT') {
    return confidence > 0.8 ? 'HIGH' : 'MODERATE';
  }
  if (stressType === 'PEST_RISK') {
    return 'MODERATE';
  }
  return 'LOW';
}

module.exports = {
  evaluateStressLocal,
  callPythonRulesEngine,
  getPythonDemoScenario,
  generateRecommendations,
  mapSeverity,
};