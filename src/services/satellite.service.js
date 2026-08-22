const axios = require('axios');

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const response = await axios.post(
    'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SENTINEL_CLIENT_ID,
      client_secret: process.env.SENTINEL_CLIENT_SECRET,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  cachedToken = response.data.access_token;
  tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000; // refresh 60s early
  return cachedToken;
}

/**
 * Fetches average NDVI and NDWI for a farm's polygon boundary
 * using Sentinel Hub Statistical API (last 30 days of imagery).
 */
async function fetchNdviNdwi(boundaryGeoJSON) {
  const token = await getAccessToken();

  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - 30);

  const requestBody = {
    input: {
      bounds: {
        geometry: boundaryGeoJSON,
        properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
      },
      data: [
        {
          type: 'sentinel-2-l2a',
          dataFilter: {
            timeRange: {
              from: fromDate.toISOString(),
              to: today.toISOString(),
            },
          },
        },
      ],
    },
    aggregation: {
      timeRange: {
        from: fromDate.toISOString(),
        to: today.toISOString(),
      },
      aggregationInterval: { of: 'P30D' },
            evalscript: `
        //VERSION=3
        function setup() {
          return {
            input: [{ bands: ["B03", "B04", "B08", "dataMask"] }],
            output: [
              { id: "ndvi", bands: 1 },
              { id: "ndwi", bands: 1 },
              { id: "dataMask", bands: 1 }
            ]
          };
        }
        function evaluatePixel(sample) {
          let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
          let ndwi = (sample.B03 - sample.B08) / (sample.B03 + sample.B08);
          return {
            ndvi: [ndvi],
            ndwi: [ndwi],
            dataMask: [sample.dataMask]
          };
        }
      `,
    },
  };

  try {
    const response = await axios.post(
      'https://sh.dataspace.copernicus.eu/api/v1/statistics',
      requestBody,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    const stats = response.data.data[0]?.outputs;
    if (!stats) {
      throw new Error('No satellite data available for this area/time range');
    }

    return {
      ndvi: Math.round(stats.ndvi.bands.B0.stats.mean * 1000) / 1000,
      ndwi: Math.round(stats.ndwi.bands.B0.stats.mean * 1000) / 1000,
    };
  } catch (err) {
    console.error('SATELLITE API ERROR:', JSON.stringify(err.response?.data || err.message, null, 2));
    throw err;
  }
}

module.exports = { fetchNdviNdwi };