const express = require('express');
const router = express.Router();
const { runAnalysis, fetchAnalysis } = require('../controllers/analysis.controller');

router.post('/', runAnalysis);
router.get('/:id', fetchAnalysis);

module.exports = router;