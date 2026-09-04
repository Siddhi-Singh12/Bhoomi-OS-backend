const express = require('express');
const router = express.Router();
const { runAnalysis, fetchAnalysis, listFarmAnalyses } = require('../controllers/analysis.controller');

router.get('/', listFarmAnalyses);
router.post('/', runAnalysis);
router.get('/farm/:farm_id', listFarmAnalyses);
router.get('/:id', fetchAnalysis);

module.exports = router;