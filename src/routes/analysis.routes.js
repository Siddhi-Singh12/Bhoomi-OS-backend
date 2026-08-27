const express = require('express');
const router = express.Router();
const {
  runAnalysis,
  fetchAnalysis,
  fetchDecisionCard,
  listAnalyses,
} = require('../controllers/analysis.controller');
const { validateAnalysisRequest } = require('../middleware/validateRequest');

router.get('/', listAnalyses);
router.post('/', validateAnalysisRequest, runAnalysis);
router.get('/:id', fetchAnalysis);
router.get('/:id/decision-card', fetchDecisionCard);

module.exports = router;