const express = require('express');
const router = express.Router();
const { registerFarm, fetchFarm, listFarms } = require('../controllers/farm.controller');
const { validateFarmCreation } = require('../middleware/validateRequest');

router.get('/', listFarms);
router.post('/', validateFarmCreation, registerFarm);
router.get('/:id', fetchFarm);

module.exports = router;