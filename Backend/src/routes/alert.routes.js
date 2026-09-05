const express = require('express');
const router = express.Router();
const { fetchAlert, fetchFarmAlerts, listAlerts } = require('../controllers/alert.controller');

router.get('/', listAlerts);
router.get('/farm/:farm_id', fetchFarmAlerts);
router.get('/:id', fetchAlert);

module.exports = router;