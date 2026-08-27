const express = require('express');
const router = express.Router();
const {
  registerFarmer,
  fetchFarmer,
  listFarmers,
  agristackLogin,
} = require('../controllers/farmer.controller');
const {
  validateFarmerRegistration,
  validateAgriStackLogin,
} = require('../middleware/validateRequest');

router.get('/', listFarmers);
router.post('/', validateFarmerRegistration, registerFarmer);
router.post('/agristack-login', validateAgriStackLogin, agristackLogin);
router.get('/:id', fetchFarmer);

module.exports = router;