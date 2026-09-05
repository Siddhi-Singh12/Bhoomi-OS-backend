const express = require('express');
const router = express.Router();
const {
  generateProofPacket,
  fetchProofPacket,
  verifyProofPacket,
  listProofPackets,
  downloadProofPacketPDF,
} = require('../controllers/proofPacket.controller');

router.get('/', listProofPackets);
router.post('/', generateProofPacket);
router.get('/verify', verifyProofPacket);
router.get('/verify/:identifier', verifyProofPacket);
router.get('/:id', fetchProofPacket);
router.get('/:id/download', downloadProofPacketPDF);

module.exports = router;