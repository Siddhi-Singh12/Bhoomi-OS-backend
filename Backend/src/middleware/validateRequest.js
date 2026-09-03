/**
 * Lightweight request validation middleware for Bhoomi OS API
 */

function validateFarmerRegistration(req, res, next) {
  const { name, phone } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Valid "name" is required.' });
  }
  if (!phone || typeof phone !== 'string' || !/^\+?[0-9]{10,15}$/.test(phone.replace(/\s+/g, ''))) {
    return res.status(400).json({ success: false, error: 'Valid 10-15 digit "phone" number is required.' });
  }
  next();
}

function validateFarmCreation(req, res, next) {
  const { farmer_id, boundary } = req.body;
  if (!farmer_id || isNaN(parseInt(farmer_id, 10))) {
    return res.status(400).json({ success: false, error: 'Valid numeric "farmer_id" is required.' });
  }
  if (!boundary) {
    return res.status(400).json({ success: false, error: '"boundary" is required (GeoJSON Polygon or coordinates array).' });
  }
  next();
}

function validateAnalysisRequest(req, res, next) {
  const { farm_id, coordinates } = req.body;
  if (!farm_id && !coordinates) {
    return res.status(400).json({ success: false, error: 'Either "farm_id" or "coordinates" must be provided.' });
  }
  if (farm_id && isNaN(parseInt(farm_id, 10))) {
    return res.status(400).json({ success: false, error: 'Valid numeric "farm_id" is required.' });
  }
  next();
}

function validateAgriStackLogin(req, res, next) {
  const { agristack_id, phone } = req.body;
  if (!agristack_id && !phone) {
    return res.status(400).json({
      success: false,
      error: 'Either "agristack_id" (e.g. AGR-IND-88219) or "phone" number is required to login.',
    });
  }
  next();
}

module.exports = {
  validateFarmerRegistration,
  validateFarmCreation,
  validateAnalysisRequest,
  validateAgriStackLogin,
};
