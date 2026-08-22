const { createProofPacket, getProofPacketById } = require('../models/proofPacket.model');

async function generateProofPacket(req, res) {
  try {
    const { analysis_id, claim_loss_percent } = req.body;

    if (!analysis_id) {
      return res.status(400).json({ success: false, error: 'analysis_id is required' });
    }

    const proofPacket = await createProofPacket({ analysis_id, claim_loss_percent });
    res.status(201).json({ success: true, proofPacket });
  } catch (err) {
    if (err.code === 'ANALYSIS_NOT_FOUND' || err.code === '23503') {
      return res.status(404).json({ success: false, error: 'analysis_id does not exist' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
}

async function fetchProofPacket(req, res) {
  try {
    const proofPacket = await getProofPacketById(req.params.id);
    if (!proofPacket) {
      return res.status(404).json({ success: false, error: 'Proof packet not found' });
    }
    res.json({ success: true, proofPacket });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { generateProofPacket, fetchProofPacket };