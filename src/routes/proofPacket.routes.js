const express = require('express');
const router = express.Router();
const { generateProofPacket, fetchProofPacket } = require('../controllers/proofPacket.controller');

router.post('/', generateProofPacket);
router.get('/:id', fetchProofPacket);

module.exports = router;