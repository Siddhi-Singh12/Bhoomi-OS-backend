const {
  getAlertById,
  getAllAlerts,
  getAlertsByFarmId,
  getAlertsByFarmerId,
  getNearbyFarmsDetails,
} = require('../models/alert.model');
const { getFarmById, getAllFarms } = require('../models/farm.model');

async function fetchAlert(req, res, next) {
  try {
    const alert = await getAlertById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    res.json({ success: true, alert });
  } catch (err) {
    next(err);
  }
}

async function fetchFarmAlerts(req, res, next) {
  try {
    const farmId = parseInt(req.params.farm_id, 10);
    if (isNaN(farmId)) {
      return res.status(400).json({ success: false, error: 'Invalid farm_id parameter' });
    }

    const farm = await getFarmById(farmId);
    if (!farm) {
      return res.status(404).json({ success: false, error: 'Farm not found' });
    }

    const alerts = await getAlertsByFarmId(farmId);
    const nearbyFarms = await getNearbyFarmsDetails(farmId, 2);

    res.json({
      success: true,
      sourceFarm: farm,
      impactRadiusKm: 2,
      nearbyFarms,
      count: alerts.length,
      alerts,
    });
  } catch (err) {
    next(err);
  }
}

async function listAlerts(req, res, next) {
  try {
    const farmId = req.query.farm_id ? parseInt(req.query.farm_id, 10) : null;
    const farmerId = req.query.farmer_id ? parseInt(req.query.farmer_id, 10) : null;

    if (farmId) {
      const farm = await getFarmById(farmId);
      if (!farm) {
        return res.status(404).json({ success: false, error: 'Farm not found' });
      }

      const alerts = await getAlertsByFarmId(farmId);
      const nearbyFarms = await getNearbyFarmsDetails(farmId, 2);

      return res.json({
        success: true,
        sourceFarm: farm,
        impactRadiusKm: 2,
        nearbyFarms,
        count: alerts.length,
        alerts,
      });
    }

    if (farmerId) {
      const farmerFarms = await getAllFarms(farmerId);
      const alerts = await getAlertsByFarmerId(farmerId);

      let primaryFarm = farmerFarms[0] || null;
      let nearbyFarms = [];

      if (primaryFarm) {
        nearbyFarms = await getNearbyFarmsDetails(primaryFarm.id, 2);
      }

      return res.json({
        success: true,
        sourceFarm: primaryFarm,
        farmerFarms,
        impactRadiusKm: 2,
        nearbyFarms,
        count: alerts.length,
        alerts,
      });
    }

    // Unscoped request: return empty alerts rather than leaking global data across farmers
    res.json({
      success: true,
      count: 0,
      alerts: [],
      nearbyFarms: [],
      message: 'Provide farm_id or farmer_id to retrieve farmer-scoped community alerts',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { fetchAlert, fetchFarmAlerts, listAlerts };