const pool = require('../config/db');

// Mock AgriStack verified farmer registry data
const MOCK_AGRISTACK_REGISTRY = {
  'AGR-IND-88219': {
    name: 'Ravi Kumar',
    phone: '9876543210',
    language: 'hi',
    state: 'Madhya Pradesh',
    district: 'Khargone',
    aadhaar_masked: 'XXXX-XXXX-4921',
    land_record_verified: true,
    total_land_area_ha: 2.35,
  },
  'AGR-PB-44021': {
    name: 'Sardar Gurdeep Singh',
    phone: '9812345678',
    language: 'pb',
    state: 'Punjab',
    district: 'Ludhiana',
    aadhaar_masked: 'XXXX-XXXX-9012',
    land_record_verified: true,
    total_land_area_ha: 4.8,
  },
  'AGR-MH-99014': {
    name: 'Anand Patil',
    phone: '9420011223',
    language: 'mr',
    state: 'Maharashtra',
    district: 'Yavatmal',
    aadhaar_masked: 'XXXX-XXXX-1142',
    land_record_verified: true,
    total_land_area_ha: 3.12,
  },
  'AGR-AP-10293': {
    name: 'Kavitha Reddy',
    phone: '9948012345',
    language: 'te',
    state: 'Andhra Pradesh',
    district: 'Guntur',
    aadhaar_masked: 'XXXX-XXXX-7731',
    land_record_verified: true,
    total_land_area_ha: 1.95,
  },
};

async function createFarmer({ name, phone, language, agristack_id }) {
  const query = `
    INSERT INTO farmers (name, phone, language, agristack_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const values = [name, phone, language || 'hi', agristack_id || null];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function getFarmerById(id) {
  const result = await pool.query('SELECT * FROM farmers WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function getFarmerByPhone(phone) {
  const result = await pool.query('SELECT * FROM farmers WHERE phone = $1', [phone]);
  return result.rows[0] || null;
}

async function getFarmerByAgriStackId(agristack_id) {
  const result = await pool.query('SELECT * FROM farmers WHERE agristack_id = $1', [agristack_id]);
  return result.rows[0] || null;
}

async function getAllFarmers() {
  const result = await pool.query('SELECT * FROM farmers ORDER BY id ASC');
  return result.rows;
}

function lookupMockAgriStackRegistry(agristack_id, phone) {
  if (agristack_id && MOCK_AGRISTACK_REGISTRY[agristack_id]) {
    return { agristack_id, ...MOCK_AGRISTACK_REGISTRY[agristack_id] };
  }
  if (phone) {
    for (const [id, data] of Object.entries(MOCK_AGRISTACK_REGISTRY)) {
      if (data.phone === phone) {
        return { agristack_id: id, ...data };
      }
    }
  }
  // Generate deterministic mock profile if custom ID passed
  if (agristack_id) {
    return {
      agristack_id,
      name: 'Kisan Beneficiary',
      phone: phone || '9800000000',
      language: 'hi',
      state: 'India',
      district: 'Central',
      aadhaar_masked: 'XXXX-XXXX-0000',
      land_record_verified: true,
      total_land_area_ha: 2.0,
    };
  }
  return null;
}

module.exports = {
  createFarmer,
  getFarmerById,
  getFarmerByPhone,
  getFarmerByAgriStackId,
  getAllFarmers,
  lookupMockAgriStackRegistry,
  MOCK_AGRISTACK_REGISTRY,
};