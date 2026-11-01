const pool = require('../config/db');
const { prioritizeVillageFields } = require('../services/droneIntelligence.service');
const logger = require('../utils/logger');

async function getPanchayatOverview(req, res, next) {
  try {
    const dailyCapacity = parseInt(req.query.daily_capacity || 45, 10);
    const prioritization = await prioritizeVillageFields({ daily_capacity: dailyCapacity });

    // Crop-wise statistics
    const crops = {};
    for (const f of prioritization.ranked_field_catalog) {
      const c = f.crop_type || 'Unknown';
      if (!crops[c]) {
        crops[c] = { total_fields: 0, high_risk_fields: 0, total_area_ha: 0, avg_fused_risk: 0, score_sum: 0 };
      }
      crops[c].total_fields += 1;
      crops[c].total_area_ha += (f.area_hectares || 0);
      crops[c].score_sum += (f.fused_risk_score || 0);
      if (f.fused_risk_score >= 50) {
        crops[c].high_risk_fields += 1;
      }
    }

    Object.keys(crops).forEach((k) => {
      crops[k].total_area_ha = Math.round(crops[k].total_area_ha * 10) / 10;
      crops[k].avg_fused_risk = Math.round(crops[k].score_sum / crops[k].total_fields);
      delete crops[k].score_sum;
    });

    // Recent alerts
    const alertsRes = await pool.query(`
      SELECT a.*, f.crop_type, fm.name AS farmer_name
      FROM alerts a
      LEFT JOIN farms f ON f.id = a.source_farm_id
      LEFT JOIN farmers fm ON fm.id = f.farmer_id
      ORDER BY a.created_at DESC
      LIMIT 10;
    `);

    // Village administrative profile
    const panchayatInfo = {
      panchayat_name: 'Nimrani Gram Panchayat',
      lgd_code: '66310',
      district: 'Khargone',
      state: 'Madhya Pradesh',
      total_villages_covered: 3,
      drone_base_station: 'Nimrani Krishi Seva Kendra',
      remote_pilot_status: 'DGCA Certified (Active Flight Window 06:30 - 10:30 IST)',
    };

    res.json({
      success: true,
      panchayat_profile: panchayatInfo,
      summary: prioritization.summary,
      crop_breakdown: crops,
      priority_queue: prioritization.mission_queue,
      ranked_fields: prioritization.ranked_field_catalog,
      recent_alerts: alertsRes.rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPanchayatOverview,
};
