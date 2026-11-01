/**
 * Bhoomi Intelligence — Comprehensive System & Integration Test Suite
 * Tests all end-to-end capabilities across Backend, Geospatial, Drone, and AI modules.
 */

const assert = require('assert');
const http = require('http');
const app = require('../src/app');
const { getDatabase } = require('../src/config/sqliteStore');
const { generateProofPacketPDF, computeEvidenceHash } = require('../src/services/pdf.service');
const { calculatePolygonAreaHectares, calculateCentroid } = require('../src/utils/geoUtils');
const { fetchWeather } = require('../src/services/weather.service');
const { fetchNdviNdwi } = require('../src/services/satellite.service');
const { evaluateStress, calculateRiskScore } = require('../src/services/rulesEngine.service');
const {
  planDroneMission,
  analyzeDroneImagery,
  fuseSatelliteAndDroneRisk,
  prioritizeVillageFields,
} = require('../src/services/droneIntelligence.service');

function mockReq(method, url, body) {
  return new Promise((resolve) => {
    const req = new http.IncomingMessage(null);
    req.method = method;
    req.url = url;
    req.headers = { 'content-type': 'application/json' };
    req.body = body || {};
    const res = new http.ServerResponse(req);
    let chunks = [];
    res.write = (chunk) => { chunks.push(Buffer.from(chunk)); };
    res.end = (chunk) => {
      if (chunk) chunks.push(Buffer.from(chunk));
      const out = Buffer.concat(chunks).toString();
      let json = null;
      try { json = JSON.parse(out); } catch (_) { json = out; }
      resolve({ statusCode: res.statusCode, body: json });
    };

    app.handle(req, res);
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('   BHOOMI INTELLIGENCE — SYSTEM VERIFICATION SUITE   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`Testing ${name}... `);
      await fn();
      console.log('PASSED');
      passed++;
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      failed++;
    }
  }

  // 1. Health & Identity
  await test('Backend Root Service & Health Endpoint', async () => {
    const res = await mockReq('GET', '/');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.service.includes('Bhoomi Intelligence'));
    assert.strictEqual(res.body.version, '2.0.0');
  });

  // 2. Database & Spatial Geodesy
  await test('Spatial Geodesic Area and Centroid Calculation', async () => {
    const coords = [[[75.612, 21.821], [75.618, 21.822], [75.617, 21.828], [75.611, 21.827], [75.612, 21.821]]];
    const area = calculatePolygonAreaHectares(coords);
    const centroid = calculateCentroid(coords);
    assert.ok(area > 10.0, `Area should be > 10 ha (got ${area})`);
    assert.ok(centroid.lat >= 21.82 && centroid.lat <= 21.83);
    assert.ok(centroid.lng >= 75.61 && centroid.lng <= 75.62);
  });

  // 3. AgriStack Authentication & Plot Import
  await test('AgriStack Login & Cadastral Plot Import', async () => {
    const login = await mockReq('POST', '/api/farmers/agristack-login', { agristack_id: 'AGR-IND-88219' });
    assert.strictEqual(login.statusCode, 200);
    assert.strictEqual(login.body.farmer.name, 'Ravi Kumar');

    const plot = await mockReq('POST', '/api/agristack/lookup-plot', { village_lgd_code: '66310', survey_number: '67A' });
    assert.strictEqual(plot.statusCode, 200);
    assert.strictEqual(plot.body.farm.crop_type, 'Wheat');
  });

  // 4. Farm Retrieval & Spatial Proximity
  await test('Farm Retrieval & PostGIS / Geodesic Neighbor Search', async () => {
    const farmRes = await mockReq('GET', '/api/farms/1');
    assert.strictEqual(farmRes.statusCode, 200);
    assert.strictEqual(farmRes.body.farm.crop_type, 'Wheat');

    const nearbyRes = await mockReq('GET', '/api/farms/1/nearby?radius_km=2');
    assert.strictEqual(nearbyRes.statusCode, 200);
    assert.ok(nearbyRes.body.nearbyFarms.length >= 2, 'Should find nearby contiguous holdings');
  });

  // 5. Weather Telemetry & Climatology Fallback
  await test('Weather Ingestion & Agro-Climatic Model', async () => {
    const weather = await fetchWeather(21.824, 75.615);
    assert.ok(weather.rainfall_mm !== undefined);
    assert.ok(weather.temperature_c !== undefined);
    assert.ok(weather.humidity_pct !== undefined);
    assert.ok(['OPEN_METEO_LIVE', 'AGRO_CLIMATOLOGY_FALLBACK'].includes(weather.source));
  });

  // 6. Satellite Multi-Spectral Indicators
  await test('Sentinel-2 Multi-Spectral Indices (NDVI, NDWI, NDMI)', async () => {
    const coords = [[[75.612, 21.821], [75.618, 21.822], [75.617, 21.828], [75.611, 21.827], [75.612, 21.821]]];
    const sat = await fetchNdviNdwi(coords, 'example_drought_scenario');
    assert.strictEqual(sat.ndvi, 0.22);
    assert.strictEqual(sat.ndwi, -0.15);
    assert.ok(sat.stress_detected === true);
    assert.ok(sat.time_series.length === 8);
  });

  // 7. Agricultural Rules Engine
  await test('Agricultural Rules Engine (Drought R1 Calamity Evaluation)', async () => {
    const boundary = { type: 'Polygon', coordinates: [[[75.61, 21.82], [75.62, 21.82], [75.62, 21.83], [75.61, 21.83], [75.61, 21.82]]] };
    const evalRes = await evaluateStress(boundary, 'example_drought_scenario');
    assert.strictEqual(evalRes.stress_type, 'DROUGHT');
    assert.strictEqual(evalRes.rule_triggered, 'R1_drought_ndvi_rainfall');
    assert.ok(evalRes.risk_score >= 85);
    assert.ok(evalRes.why_flagged.length >= 2);
  });

  // 8. Drone Mission Planner
  await test('Drone Mission Planner (60m AGL, 70/80 Overlap, Grid Survey)', async () => {
    const coords = [[[75.612, 21.821], [75.618, 21.822], [75.617, 21.828], [75.611, 21.827], [75.612, 21.821]]];
    const plan = await planDroneMission({
      farm_id: 1,
      boundary: coords,
      altitude_m: 60.0,
      side_overlap_pct: 70.0,
      forward_overlap_pct: 80.0,
      speed_ms: 5.0,
    });
    assert.strictEqual(plan.status, 'PLANNED');
    assert.ok(plan.plan.waypoints.length > 50, 'Waypoints generated');
    assert.strictEqual(plan.plan.mission_parameters.gsd_cm_per_pixel, 1.64);
  });

  // 9. Drone Computer Vision (ExG, VARI, Plant/Soil Segmentation)
  await test('Drone RGB Computer Vision (ExG & VARI Canopy Analysis)', async () => {
    const cv = await analyzeDroneImagery({ farm_id: 1, image_path: '' });
    assert.ok(cv.cv_details.canopy_metrics.canopy_cover_pct > 50);
    assert.ok(cv.cv_details.stress_metrics.stress_area_pct_field > 10);
    assert.ok(cv.cv_details.scientific_disclosure.limitations.length >= 2);
  });

  // 10. Multi-Resolution Satellite-Drone Data Fusion
  await test('Satellite-Drone Mathematical Risk Fusion Engine', async () => {
    const fused = await fuseSatelliteAndDroneRisk({
      farm_id: 1,
      ndvi: 0.22,
      ndwi: -0.15,
      rainfall_mm: 4.0,
      temperature_c: 39.0,
      persistence_days: 14,
      drone_stress_fraction: 0.185,
      crop_type: 'Wheat',
    });
    assert.ok(fused.fused_risk_score > 65);
    assert.ok(['CRITICAL', 'HIGH'].includes(fused.risk_category));
    assert.ok(fused.contributing_factors.length >= 3);
  });

  // 11. Intelligent Drone Prioritisation Queue
  await test('Intelligent Prioritisation & Daily Flight Capacity Queue', async () => {
    const queue = await prioritizeVillageFields({ daily_capacity: 45, min_risk_threshold: 40.0 });
    assert.ok(queue.summary.total_registered_fields >= 3);
    assert.strictEqual(queue.summary.daily_drone_capacity, 45);
    assert.ok(queue.ranked_field_catalog[0].priority_rank === 1);
  });

  // 12. Panchayat Intelligence Overview
  await test('Panchayat Intelligence & Crop-Wise Risk Summary', async () => {
    const panRes = await mockReq('GET', '/api/panchayat/overview');
    assert.strictEqual(panRes.statusCode, 200);
    assert.ok(panRes.body.panchayat_profile.panchayat_name.includes('Nimrani'));
    assert.ok(panRes.body.crop_breakdown.Wheat !== undefined);
  });

  // 13. PDF Proof Packet & Cryptographic Verification
  await test('Tamper-Evident PDF Generation & SHA-256 Verification', async () => {
    const pdfBuf = await generateProofPacketPDF({
      analysis_id: 1,
      farmer_name: 'Ravi Kumar',
      agristack_id: 'AGR-IND-88219',
      claim_crop_type: 'Wheat',
      claim_area_hectares: 2.35,
      claim_loss_percent: 40,
      ndvi: 0.22,
      ndwi: 0.05,
      rainfall_mm: 4.0,
      temperature_c: 39.0,
      stress_type: 'DROUGHT',
      confidence: 0.95,
      has_drone_data: true,
      satellite_risk_score: 88,
      drone_risk_score: 78,
      fused_risk_score: 82,
    });
    assert.ok(pdfBuf.length > 20000, 'PDF buffer size should exceed 20KB');

    const verifyRes = await mockReq('GET', '/api/proof-packets/verify?id=1');
    assert.strictEqual(verifyRes.statusCode, 200);
    assert.strictEqual(verifyRes.body.verified, true);
  });

  console.log('\n====================================================');
  console.log(`   SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
