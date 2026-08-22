const { createFarm, getFarmById } = require('../models/farm.model');

async function registerFarm(req, res) {
  try {
    const { farmer_id, crop_type, boundary } = req.body;

    if (!farmer_id || !boundary) {
      return res.status(400).json({ success: false, error: 'farmer_id and boundary are required' });
    }

    const farm = await createFarm({ farmer_id, crop_type, boundary });
    res.status(201).json({ success: true, farm });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(404).json({ success: false, error: 'farmer_id does not exist' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
}

async function fetchFarm(req, res) {
  try {
    const farm = await getFarmById(req.params.id);
    if (!farm) {
      return res.status(404).json({ success: false, error: 'Farm not found' });
    }
    res.json({ success: true, farm });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { registerFarm, fetchFarm };