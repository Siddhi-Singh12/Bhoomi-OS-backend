const express = require('express');
const router = express.Router();
const { registerFarm, fetchFarm } = require('../controllers/farm.controller');

router.post('/', registerFarm);
router.get('/:id', fetchFarm);

module.exports = router;