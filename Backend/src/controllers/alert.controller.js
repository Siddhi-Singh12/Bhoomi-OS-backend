const { getAlertById, getAllAlerts } = require('../models/alert.model');

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

async function listAlerts(req, res, next) {
  try {
    const alerts = await getAllAlerts();
    res.json({ success: true, count: alerts.length, alerts });
  } catch (err) {
    next(err);
  }
}

module.exports = { fetchAlert, listAlerts };