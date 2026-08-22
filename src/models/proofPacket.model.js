const pool = require('../config/db');

async function createProofPacket({ analysis_id, claim_loss_percent }) {
  // Pull farm + analysis data together to auto-fill claim fields
  const infoQuery = `
    SELECT f.crop_type, f.area_hectares, a.stress_type
    FROM analyses a
    JOIN farms f ON f.id = a.farm_id
    WHERE a.id = $1;
  `;
  const infoResult = await pool.query(infoQuery, [analysis_id]);

  if (infoResult.rows.length === 0) {
    const err = new Error('analysis_id does not exist');
    err.code = 'ANALYSIS_NOT_FOUND';
    throw err;
  }

  const { crop_type, area_hectares } = infoResult.rows[0];

  const insertQuery = `
    INSERT INTO proof_packets (analysis_id, pdf_url, evidence_hash, claim_crop_type, claim_loss_percent, claim_area_hectares)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const values = [
    analysis_id,
    'PENDING',          // pdf_url placeholder — pdf.service.js will fill this later
    null,                // evidence_hash placeholder — will be computed with PDF
    crop_type,
    claim_loss_percent || null,
    area_hectares,
  ];
  const result = await pool.query(insertQuery, values);
  return result.rows[0];
}

async function getProofPacketById(id) {
  const result = await pool.query('SELECT * FROM proof_packets WHERE id = $1', [id]);
  return result.rows[0];
}

module.exports = { createProofPacket, getProofPacketById };