/**
 * MOCK Rules Engine — Person 2's Python engine will eventually replace this.
 * When real engine is ready, replace the body of this function with an
 * HTTP call (axios/fetch) to their endpoint. Everything calling this
 * function (analysis.model.js) stays unchanged.
 */
function evaluateStress({ ndvi, ndwi, rainfall_mm, temperature_c }) {
  let stress_type = 'NONE';
  let rule_triggered = 'NONE_RULE_01';
  let confidence = 0.75;

  if (ndvi < 0.3 && rainfall_mm < 20) {
    stress_type = 'DROUGHT';
    rule_triggered = 'DROUGHT_RULE_01';
    confidence = 0.85;
  } else if (ndwi < 0.2 && temperature_c > 35) {
    stress_type = 'PEST_RISK';
    rule_triggered = 'PEST_RISK_RULE_01';
    confidence = 0.78;
  }

  return { stress_type, rule_triggered, confidence };
}

module.exports = { evaluateStress };