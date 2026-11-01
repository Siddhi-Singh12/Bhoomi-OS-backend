const express = require('express');
const router = express.Router();
const { getPanchayatOverview } = require('../controllers/panchayat.controller');

router.get('/overview', getPanchayatOverview);

module.exports = router;
