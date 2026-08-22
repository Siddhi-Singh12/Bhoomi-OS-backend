const { createFarmer, getFarmerById } = require('../models/farmer.model');

async function registerFarmer(req, res) {
  try {
    const { name, phone, language, agristack_id } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'name and phone are required' });
    }

    const farmer = await createFarmer({ name, phone, language, agristack_id });
    res.status(201).json({ success: true, farmer });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Phone number already registered' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
}

async function fetchFarmer(req, res) {
  try {
    const farmer = await getFarmerById(req.params.id);
    if (!farmer) {
      return res.status(404).json({ success: false, error: 'Farmer not found' });
    }
    res.json({ success: true, farmer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { registerFarmer, fetchFarmer };