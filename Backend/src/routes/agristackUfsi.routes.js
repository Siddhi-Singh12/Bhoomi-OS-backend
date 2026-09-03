const express = require('express');
const router = express.Router();
const {
  lookupAndImportPlot,
  getCropSurvey,
  checkSchemeEligibility,
  getSamplePlots,
} = require('../controllers/agristackUfsi.controller');

router.get('/sample-plots', getSamplePlots);
router.post('/lookup-plot', lookupAndImportPlot);
router.post('/crop-survey', getCropSurvey);
router.post('/scheme-eligibility', checkSchemeEligibility);

module.exports = router;
