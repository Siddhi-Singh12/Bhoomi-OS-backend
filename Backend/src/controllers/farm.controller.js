const { createFarm, getFarmById, getAllFarms } = require('../models/farm.model');

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

async function listFarms(req, res, next) {
  try {
    const farmerId = req.query.farmer_id ? parseInt(req.query.farmer_id, 10) : null;
    const farms = await getAllFarms(farmerId);
    res.json({ success: true, count: farms.length, farms });
  } catch (err) {
    next(err);
  }
}

module.exports = { registerFarm, fetchFarm, listFarms };