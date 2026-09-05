const { createFarm, getFarmById, getAllFarms } = require('../models/farm.model');
const { getNearbyFarmsDetails } = require('../models/alert.model');

async function registerFarm(req, res, next) {
  try {
    const { farmer_id, crop_type, boundary, location_name, state } = req.body;

    const farm = await createFarm({ farmer_id, crop_type, boundary, location_name, state });
    res.status(201).json({ success: true, farm });
  } catch (err) {
    next(err);
  }
}

async function fetchFarm(req, res, next) {
  try {
    const farm = await getFarmById(req.params.id);
    if (!farm) {
      return res.status(404).json({ success: false, error: 'Farm not found' });
    }
    res.json({ success: true, farm });
  } catch (err) {
    next(err);
  }
}

async function fetchNearbyFarms(req, res, next) {
  try {
    const farmId = parseInt(req.params.id, 10);
    const radiusKm = parseFloat(req.query.radius_km || 2);

    const farm = await getFarmById(farmId);
    if (!farm) {
      return res.status(404).json({ success: false, error: 'Farm not found' });
    }

    const nearbyFarms = await getNearbyFarmsDetails(farmId, radiusKm);
    res.json({
      success: true,
      farm_id: farmId,
      radius_km: radiusKm,
      sourceFarm: farm,
      nearbyFarms,
    });
  } catch (err) {
    next(err);
  }
}

async function listFarms(req, res, next) {
  try {
    const farmerId = req.query.farmer_id ? parseInt(req.query.farmer_id, 10) : null;
    const farms = await getAllFarms(farmerId);
    res.json({ success: true, count: farms.length, farms });
  } catch (err) {
    next(err);
  }
}

module.exports = { registerFarm, fetchFarm, fetchNearbyFarms, listFarms };