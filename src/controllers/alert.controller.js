const { getAlertById } = require('../models/alert.model');

async function fetchAlert(req, res) {
  try {
    const alert = await getAlertById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { fetchAlert };