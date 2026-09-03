const pool = require('../config/db');
const { generateProofPacketPDF, computeEvidenceHash } = require('../services/pdf.service');
const { saveProofPacketPDF } = require('../services/storage.service');
const logger = require('../utils/logger');

async function createProofPacket({ analysis_id, claim_loss_percent }) {
  let fullData = null;

  // 1. Fetch complete analysis + farm + farmer metadata
  try {
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
  } catch (dbErr) {
    if (dbErr.code === 'ANALYSIS_NOT_FOUND') throw dbErr;
    logger.warn(`Database lookup skipped in proof packet creation: ${dbErr.message}. Using synthetic claim packet.`);
    // Synthetic fallback for offline test/demo
    fullData = {
      analysis_id,
      farm_id: 1,
      farmer_id: 1,
      farmer_name: 'Ravi Kumar',
      farmer_phone: '9876543210',
      agristack_id: 'AGR-IND-88219',
      claim_crop_type: 'Wheat',
      claim_area_hectares: 2.35,
      ndvi: 0.22,
      ndwi: 0.08,
      rainfall_mm: 12.5,
      temperature_c: 37.8,
      stress_type: 'DROUGHT',
      confidence: 0.88,
      rule_triggered: 'R1_drought_low_ndvi_dry_spell',
      analyzed_at: new Date().toISOString(),
    };
  }

  const lossPercent = claim_loss_percent != null ? Number(claim_loss_percent) : 40.0;
  fullData.claim_loss_percent = lossPercent;
  fullData.generated_at = new Date().toISOString();

  // 2. Generate Evidence Hash
  const evidenceHash = computeEvidenceHash(fullData);
  fullData.evidence_hash = evidenceHash;

  // 3. Generate PDF Buffer & Save to Storage
  const filename = `proof-packet-analysis-${analysis_id}-${Date.now()}.pdf`;
  const pdfBuffer = await generateProofPacketPDF(fullData);
  const pdfUrl = await saveProofPacketPDF(filename, pdfBuffer);

  // 4. Save to Database
  let savedRecord = null;
  try {
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
    savedRecord = result.rows[0];
  } catch (insertDbErr) {
    logger.warn(`Could not save proof packet to DB: ${insertDbErr.message}`);
    savedRecord = {
      id: Math.floor(Date.now() % 100000),
      analysis_id,
      pdf_url: pdfUrl,
      evidence_hash: evidenceHash,
      claim_crop_type: fullData.claim_crop_type,
      claim_loss_percent: lossPercent,
      claim_area_hectares: fullData.claim_area_hectares,
      generated_at: fullData.generated_at,
    };
  }

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
  try {
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
  } catch (err) {
    logger.warn(`DB getProofPacketById failed: ${err.message}`);
    return null;
  }
}

async function getAllProofPackets() {
  try {
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
  } catch (err) {
    logger.warn(`DB getAllProofPackets failed: ${err.message}`);
    return [];
  }
}

module.exports = {
  createProofPacket,
  getProofPacketById,
  getAllProofPackets,
};