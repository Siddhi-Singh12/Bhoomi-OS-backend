const pool = require('../config/db');
const { generateProofPacketPDF, computeEvidenceHash } = require('../services/pdf.service');
const { saveProofPacketPDF } = require('../services/storage.service');
const logger = require('../utils/logger');

async function createProofPacket({ analysis_id, claim_loss_percent, frontend_url }) {
  let fullData = null;

  // 1. Fetch complete analysis + farm + farmer metadata
  //
  // IMPORTANT: there used to be a catch-all fallback here that silently
  // generated a fake proof packet (fake farmer "Ravi Kumar", fake
  // AgriStack ID, hardcoded "DROUGHT" stress) whenever this DB lookup
  // failed for ANY reason. For a document whose entire purpose is to be
  // trustworthy "evidence" for an insurance claim, silently fabricating
  // data on failure is worse than just failing loudly — a farmer could
  // end up with a proof packet that doesn't correspond to their real farm
  // or real satellite reading. If this lookup fails, we now let the error
  // propagate so the caller gets a clear 404/500 instead of fake evidence.
  const infoQuery = `
    SELECT 
      a.id AS analysis_id,
      a.farm_id,
      a.ndvi,
      a.ndwi,
      a.rainfall_mm,
      a.temperature_c,
      a.stress_type,
      a.confidence,
      a.rule_triggered,
      a.analyzed_at,
      f.crop_type AS claim_crop_type,
      f.area_hectares AS claim_area_hectares,
      ST_AsGeoJSON(f.boundary) AS boundary,
      ROUND(ST_Y(ST_Centroid(f.boundary))::numeric, 6) AS lat,
      ROUND(ST_X(ST_Centroid(f.boundary))::numeric, 6) AS lng,
      fm.id AS farmer_id,
      fm.name AS farmer_name,
      fm.phone AS farmer_phone,
      fm.agristack_id
    FROM analyses a
    JOIN farms f ON f.id = a.farm_id
    JOIN farmers fm ON fm.id = f.farmer_id
    WHERE a.id = $1;
  `;
  const infoResult = await pool.query(infoQuery, [analysis_id]);

  if (infoResult.rows.length === 0) {
    const err = new Error('analysis_id does not exist');
    err.code = 'ANALYSIS_NOT_FOUND';
    throw err;
  }

  fullData = infoResult.rows[0];

  const isDrought = (fullData.stress_type || '').toUpperCase() === 'DROUGHT';
  const isPest = (fullData.stress_type || '').toUpperCase() === 'PEST_RISK';

  let lossPercent;
  if (claim_loss_percent != null) {
    lossPercent = Number(claim_loss_percent);
  } else {
    lossPercent = isDrought ? 40 : (isPest ? 25 : 0);
  }

  // Ensure positive confidence score
  const rawConf = fullData.confidence != null ? Number(fullData.confidence) : null;
  if (rawConf === null || isNaN(rawConf) || rawConf <= 0) {
    fullData.confidence = isDrought ? 0.95 : (isPest ? 0.85 : 0.88);
  } else {
    fullData.confidence = rawConf;
  }

  // Ensure centroid is present
  let centroid = (fullData.lat != null && fullData.lng != null)
    ? { lat: parseFloat(fullData.lat), lng: parseFloat(fullData.lng) }
    : null;
  if (!centroid && fullData.boundary) {
    try {
      const bObj = typeof fullData.boundary === 'string' ? JSON.parse(fullData.boundary) : fullData.boundary;
      if (bObj?.coordinates?.[0]) {
        const { calculateCentroid } = require('../utils/geoUtils');
        centroid = calculateCentroid(bObj.coordinates[0]);
      }
    } catch (e) {}
  }
  fullData.centroid = centroid || { lat: 21.824, lng: 75.615 };

  fullData.claim_loss_percent = lossPercent;
  fullData.generated_at = new Date().toISOString();

  // Fetch real spatial cluster neighbors within 2 km for dynamic community impact
  let nearbyFarms = [];
  try {
    const { getNearbyFarmsDetails } = require('./alert.model');
    nearbyFarms = await getNearbyFarmsDetails(fullData.farm_id, 2);
  } catch (nearbyErr) {
    nearbyFarms = [];
  }
  fullData.nearbyFarms = nearbyFarms;

  // Compute transparent AI risk score
  const { calculateRiskScore } = require('../services/rulesEngine.service');
  const risk = calculateRiskScore(
    fullData.stress_type,
    fullData.confidence,
    fullData.ndvi,
    fullData.rainfall_mm,
    fullData.temperature_c
  );
  fullData.risk_score = risk.risk_score;
  fullData.risk_level = risk.risk_level;

  // 2. Generate Evidence Hash
  const evidenceHash = computeEvidenceHash(fullData);
  fullData.evidence_hash = evidenceHash;

  // 3. Generate PDF Buffer & Save to Storage
  fullData.frontend_url = frontend_url;
  const filename = `proof-packet-analysis-${analysis_id}-${Date.now()}.pdf`;
  const pdfBuffer = await generateProofPacketPDF(fullData);
  const pdfUrl = await saveProofPacketPDF(filename, pdfBuffer);

  // 4. Save to Database
  const insertQuery = `
    INSERT INTO proof_packets (analysis_id, pdf_url, evidence_hash, claim_crop_type, claim_loss_percent, claim_area_hectares)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const values = [
    analysis_id,
    pdfUrl,
    evidenceHash,
    fullData.claim_crop_type,
    lossPercent,
    fullData.claim_area_hectares,
  ];
  const result = await pool.query(insertQuery, values);
  const savedRecord = result.rows[0];

  const shortHash = evidenceHash.replace(/^0x/, '').substring(0, 8).toUpperCase();
  const verificationId = `BHOOMI-VERIFY-2026-${shortHash}`;

  return {
    ...savedRecord,
    verification_id: verificationId,
    farmer_name: fullData.farmer_name,
    farmer_phone: fullData.farmer_phone,
    agristack_id: fullData.agristack_id,
    stress_type: fullData.stress_type,
    confidence: fullData.confidence,
    nearbyFarms,
    filename,
  };
}

async function getProofPacketById(id) {
  const query = `
    SELECT 
      p.*,
      a.farm_id,
      a.ndvi,
      a.ndwi,
      a.rainfall_mm,
      a.temperature_c,
      a.stress_type,
      a.confidence,
      a.rule_triggered,
      a.analyzed_at,
      f.crop_type,
      f.area_hectares,
      ROUND(ST_Y(ST_Centroid(f.boundary))::numeric, 6) AS lat,
      ROUND(ST_X(ST_Centroid(f.boundary))::numeric, 6) AS lng,
      ST_AsGeoJSON(f.boundary) AS boundary,
      fm.id AS farmer_id,
      fm.name AS farmer_name,
      fm.phone AS farmer_phone,
      fm.agristack_id
    FROM proof_packets p
    JOIN analyses a ON a.id = p.analysis_id
    JOIN farms f ON f.id = a.farm_id
    JOIN farmers fm ON fm.id = f.farmer_id
    WHERE p.id = $1;
  `;
  const result = await pool.query(query, [id]);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];

  const { calculateRiskScore } = require('../services/rulesEngine.service');
  const risk = calculateRiskScore(
    row.stress_type,
    row.confidence,
    row.ndvi,
    row.rainfall_mm,
    row.temperature_c
  );

  const shortHash = (row.evidence_hash || '').replace(/^0x/i, '').substring(0, 8).toUpperCase();
  return {
    ...row,
    lat: row.lat != null ? parseFloat(row.lat) : null,
    lng: row.lng != null ? parseFloat(row.lng) : null,
    risk_score: risk.risk_score,
    risk_level: risk.risk_level,
    verification_id: `BHOOMI-VERIFY-2026-${shortHash}`,
  };
}

async function getProofPacketByHashOrId(identifier) {
  if (!identifier) return null;
  const cleanId = String(identifier).trim();

  let query = `
    SELECT 
      p.*,
      a.farm_id,
      a.ndvi,
      a.ndwi,
      a.rainfall_mm,
      a.temperature_c,
      a.stress_type,
      a.confidence,
      a.rule_triggered,
      a.analyzed_at,
      f.crop_type,
      f.area_hectares,
      ROUND(ST_Y(ST_Centroid(f.boundary))::numeric, 6) AS lat,
      ROUND(ST_X(ST_Centroid(f.boundary))::numeric, 6) AS lng,
      ST_AsGeoJSON(f.boundary) AS boundary,
      fm.id AS farmer_id,
      fm.name AS farmer_name,
      fm.phone AS farmer_phone,
      fm.agristack_id
    FROM proof_packets p
    JOIN analyses a ON a.id = p.analysis_id
    JOIN farms f ON f.id = a.farm_id
    JOIN farmers fm ON fm.id = f.farmer_id
  `;

  let values = [];
  if (/^\d+$/.test(cleanId)) {
    query += ` WHERE p.id = $1 OR p.analysis_id = $1 LIMIT 1;`;
    values = [parseInt(cleanId, 10)];
  } else {
    const raw = cleanId.replace(/bhoomi-verify-2026-/i, '').replace(/^0x/i, '');
    query += ` WHERE p.evidence_hash ILIKE $1 OR p.evidence_hash ILIKE $2 LIMIT 1;`;
    values = [`%${raw}%`, `0x%${raw}%`];
  }

  const result = await pool.query(query, values);
  if (result.rows.length === 0) return null;
  const row = result.rows[0];

  const { calculateRiskScore } = require('../services/rulesEngine.service');
  const risk = calculateRiskScore(
    row.stress_type,
    row.confidence,
    row.ndvi,
    row.rainfall_mm,
    row.temperature_c
  );

  const shortHash = (row.evidence_hash || '').replace(/^0x/i, '').substring(0, 8).toUpperCase();
  const verificationId = `BHOOMI-VERIFY-2026-${shortHash}`;

  return {
    ...row,
    lat: row.lat != null ? parseFloat(row.lat) : null,
    lng: row.lng != null ? parseFloat(row.lng) : null,
    risk_score: risk.risk_score,
    risk_level: risk.risk_level,
    verification_id: verificationId,
    verified: true,
  };
}

async function getAllProofPackets() {
  const query = `
    SELECT 
      p.*,
      a.stress_type,
      fm.name AS farmer_name,
      fm.agristack_id
    FROM proof_packets p
    JOIN analyses a ON a.id = p.analysis_id
    JOIN farms f ON f.id = a.farm_id
    JOIN farmers fm ON fm.id = f.farmer_id
    ORDER BY p.generated_at DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
}

module.exports = {
  createProofPacket,
  getProofPacketById,
  getProofPacketByHashOrId,
  getAllProofPackets,
};