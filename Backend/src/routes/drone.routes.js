const express = require('express');
const router = express.Router();
const {
  createMission,
  listMissions,
  getMission,
  runCV,
  runFusion,
  getPrioritization,
  processOrthomosaic,
} = require('../controllers/drone.controller');

router.post('/missions', createMission);
router.get('/missions', listMissions);
router.get('/missions/:id', getMission);

router.post('/cv-analyze', runCV);
router.post('/fuse', runFusion);
router.get('/prioritize', getPrioritization);
router.post('/orthomosaic', processOrthomosaic);

module.exports = router;
