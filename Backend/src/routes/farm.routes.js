const express = require('express');
const router = express.Router();
const { registerFarm, fetchFarm, fetchNearbyFarms, listFarms } = require('../controllers/farm.controller');
const { validateFarmCreation } = require('../middleware/validateRequest');

router.get('/', listFarms);
router.post('/', validateFarmCreation, registerFarm);
router.get('/:id', fetchFarm);
router.get('/:id/nearby', fetchNearbyFarms);

module.exports = router;