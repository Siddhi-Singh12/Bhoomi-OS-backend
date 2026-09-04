const pool = require('../config/db');
const { generateProofPacketPDF, computeEvidenceHash } = require('../services/pdf.service');
const { saveProofPacketPDF } = require('../services/storage.service');
const logger = require('../utils/logger');

async function createProofPacket({ analysis_id, claim_loss_percent }) {
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

  // claim_loss_percent should reflect the actual detected stress, not a
  // hardcoded number. If the caller didn't explicitly provide one:
  //   - stress_type NONE  -> 0 (no stress was detected, so no loss claim)
  //   - DROUGHT / PEST_RISK -> we don't have an official PMFBY loss
  //     formula yet (this is a known MVP gap), so we leave it at 0 and
  //     rely on the caller/operator to supply a real assessed figure
  //     rather than inventing one.
  let lossPercent;
  if (claim_loss_percent != null) {
    lossPercent = Number(claim_loss_percent);
  } else {
    lossPercent = 0;
  }

  fullData.claim_loss_percent = lossPercent;
  fullData.generated_at = new Date().toISOString();

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
  const filename = `proof-packet-analysis-${analysis_id}-${Date.now()}.pdf`;
  const pdfBuffer = await generateProofPacketPDF(fullData);
  const pdfUrl = await saveProofPacketPDF(filename, pdfBuffer);

  // 4. Save to Database
  // (No more silent fake-record fallback here either — if the insert
  // fails, that's a real error the caller should see, not a made-up
  // in-memory record that looks saved but isn't.)
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

  return {
    ...savedRecord,
    farmer_name: fullData.farmer_name,
    farmer_phone: fullData.farmer_phone,
    agristack_id: fullData.agristack_id,
    stress_type: fullData.stress_type,
    confidence: fullData.confidence,
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
  return result.rows[0] || null;
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
  getAllProofPackets,
};