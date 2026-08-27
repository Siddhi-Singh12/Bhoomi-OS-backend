const {
  createFarmer,
  getFarmerById,
  getFarmerByPhone,
  getFarmerByAgriStackId,
  getAllFarmers,
  lookupMockAgriStackRegistry,
} = require('../models/farmer.model');
const { getAllFarms } = require('../models/farm.model');
const logger = require('../utils/logger');

async function registerFarmer(req, res, next) {
  try {
    const { name, phone, language, agristack_id } = req.body;

    const farmer = await createFarmer({ name, phone, language, agristack_id });
    res.status(201).json({ success: true, farmer });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Phone number already registered' });
    }
    next(err);
  }
}

async function fetchFarmer(req, res, next) {
  try {
    const farmer = await getFarmerById(req.params.id);
    if (!farmer) {
      return res.status(404).json({ success: false, error: 'Farmer not found' });
    }
    const farms = await getAllFarms(farmer.id);
    res.json({ success: true, farmer: { ...farmer, farms } });
  } catch (err) {
    next(err);
  }
}

async function listFarmers(req, res, next) {
  try {
    const farmers = await getAllFarmers();
    res.json({ success: true, count: farmers.length, farmers });
  } catch (err) {
    next(err);
  }
}

/**
 * Mock AgriStack OAuth/Federated Login for Indian Farmers
 * Validates against national AgriStack ID (or linked mobile OTP mock)
 */
async function agristackLogin(req, res, next) {
  try {
    const { agristack_id, phone } = req.body;

    const registryData = lookupMockAgriStackRegistry(agristack_id, phone);

    let farmer = null;
    let farms = [];

    try {
      if (agristack_id) {
        farmer = await getFarmerByAgriStackId(agristack_id);
      }
      if (!farmer && phone) {
        farmer = await getFarmerByPhone(phone);
      }

      // Auto-onboard if registered on national AgriStack but first time on Bhoomi OS
      if (!farmer && registryData) {
        try {
          farmer = await createFarmer({
            name: registryData.name,
            phone: registryData.phone,
            language: registryData.language,
            agristack_id: registryData.agristack_id,
          });
          logger.info(`Auto-onboarded AgriStack farmer: ${farmer.name} (${farmer.agristack_id})`);
        } catch (insertErr) {
          if (insertErr.code === '23505') {
            farmer = (await getFarmerByPhone(registryData.phone)) || (await getFarmerByAgriStackId(registryData.agristack_id));
          } else {
            throw insertErr;
          }
        }
      }

      if (farmer) {
        farms = await getAllFarms(farmer.id);
      }
    } catch (dbErr) {
      logger.warn(`Database query skipped during AgriStack login: ${dbErr.message}`);
    }

    if (!farmer && !registryData) {
      return res.status(404).json({
        success: false,
        error: 'No AgriStack record found for provided identifier.',
      });
    }

    const mockToken = `bhoomi_jwt_${Buffer.from(`${farmer?.id || 'mock'}:${Date.now()}`).toString('base64')}`;

    res.json({
      success: true,
      message: 'AgriStack authentication successful',
      token: mockToken,
      farmer: farmer || {
        id: null,
        name: registryData.name,
        phone: registryData.phone,
        agristack_id: registryData.agristack_id,
        language: registryData.language,
      },
      agristack_profile: {
        verified: true,
        registry: registryData,
        verified_at: new Date().toISOString(),
      },
      farms,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerFarmer,
  fetchFarmer,
  listFarmers,
  agristackLogin,
};