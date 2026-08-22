const express = require('express');
const router = express.Router();
const { registerFarmer, fetchFarmer } = require('../controllers/farmer.controller');

router.post('/', registerFarmer);
router.get('/:id', fetchFarmer);

module.exports = router;