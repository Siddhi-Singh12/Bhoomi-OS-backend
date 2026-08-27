const express = require('express');
const router = express.Router();
const { fetchAlert, listAlerts } = require('../controllers/alert.controller');

router.get('/', listAlerts);
router.get('/:id', fetchAlert);

module.exports = router;