const express = require('express');
const router = express.Router();
const {
  generateProofPacket,
  fetchProofPacket,
  listProofPackets,
  downloadProofPacketPDF,
} = require('../controllers/proofPacket.controller');

router.get('/', listProofPackets);
router.post('/', generateProofPacket);
router.get('/:id', fetchProofPacket);
router.get('/:id/download', downloadProofPacketPDF);

module.exports = router;