const path = require('path');
const {
  createProofPacket,
  getProofPacketById,
  getProofPacketByHashOrId,
  getAllProofPackets,
} = require('../models/proofPacket.model');
const { getProofPacketFilePath } = require('../services/storage.service');

async function generateProofPacket(req, res, next) {
  try {
    const { analysis_id, claim_loss_percent, frontend_url } = req.body;

    if (!analysis_id) {
      return res.status(400).json({ success: false, error: 'analysis_id is required' });
    }

    const hostOrigin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
    const resolvedFrontend = frontend_url || hostOrigin || null;

    const proofPacket = await createProofPacket({
      analysis_id,
      claim_loss_percent,
      frontend_url: resolvedFrontend,
    });
    res.status(201).json({
      success: true,
      message: 'Proof packet generated successfully with cryptographic evidence hash',
      proofPacket,
    });
  } catch (err) {
    if (err.code === 'ANALYSIS_NOT_FOUND' || err.code === '23503') {
      return res.status(404).json({ success: false, error: 'analysis_id does not exist' });
    }
    next(err);
  }
}

async function fetchProofPacket(req, res, next) {
  try {
    const proofPacket = await getProofPacketById(req.params.id);
    if (!proofPacket) {
      return res.status(404).json({ success: false, error: 'Proof packet not found' });
    }
    res.json({ success: true, proofPacket });
  } catch (err) {
    next(err);
  }
}

async function verifyProofPacket(req, res, next) {
  try {
    const identifier = req.query.id || req.query.hash || req.params.identifier;
    if (!identifier) {
      return res.status(400).json({ success: false, error: 'Verification ID or hash is required' });
    }

    const proofPacket = await getProofPacketByHashOrId(identifier);
    if (!proofPacket) {
      return res.status(404).json({
        success: false,
        verified: false,
        error: 'No sealed proof packet matches the provided cryptographic verification identifier.',
      });
    }

    res.json({
      success: true,
      verified: true,
      verification_id: proofPacket.verification_id,
      proofPacket,
    });
  } catch (err) {
    next(err);
  }
}

async function listProofPackets(req, res, next) {
  try {
    const proofPackets = await getAllProofPackets();
    res.json({ success: true, count: proofPackets.length, proofPackets });
  } catch (err) {
    next(err);
  }
}

async function downloadProofPacketPDF(req, res, next) {
  try {
    const proofPacket = await getProofPacketById(req.params.id);
    if (!proofPacket || !proofPacket.pdf_url) {
      return res.status(404).json({ success: false, error: 'Proof packet or PDF not found' });
    }

    const filename = path.basename(proofPacket.pdf_url);
    const filePath = getProofPacketFilePath(filename);

    if (!filePath) {
      return res.status(404).json({ success: false, error: 'PDF file not found in storage' });
    }

    res.download(filePath, `PMFBY-Proof-Packet-${proofPacket.id || req.params.id}.pdf`);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateProofPacket,
  fetchProofPacket,
  verifyProofPacket,
  listProofPackets,
  downloadProofPacketPDF,
};