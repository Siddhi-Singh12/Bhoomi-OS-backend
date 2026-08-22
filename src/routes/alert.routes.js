const express = require('express');
const router = express.Router();
const { fetchAlert } = require('../controllers/alert.controller');

router.get('/:id', fetchAlert);

module.exports = router;