const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Fetches comprehensive meteorological indicators for agricultural risk analysis.
 * Uses Open-Meteo API with strict compliance headers and agro-climatic climatology fallback.
 */
async function fetchWeather(lat, lng) {
  const latitude = typeof lat === 'number' ? lat : parseFloat(lat) || 21.824;
  const longitude = typeof lng === 'number' ? lng : parseFloat(lng) || 75.615;

  const url = 'https://api.open-meteo.com/v1/forecast';
  const params = {
    latitude,
    longitude,
    daily: 'precipitation_sum,temperature_2m_max,temperature_2m_min,wind_speed_10m_max',
    hourly: 'relative_humidity_2m',
    past_days: 7,
    forecast_days: 7,
    timezone: 'auto',
  };

  try {
    const response = await axios.get(url, {
      params,
      headers: {
        'User-Agent': 'BhoomiIntelligence/2.0 (contact@bhoomi.gov.in; precision-agriculture)',
        Accept: 'application/json',
      },
      timeout: 3500,
    });

    const daily = response.data?.daily;
    const hourly = response.data?.hourly;

    if (!daily || !daily.precipitation_sum) {
      throw new Error('Invalid Open-Meteo weather schema received');
    }

    // Cumulative 7-day past precipitation
    const pastRain = (daily.precipitation_sum.slice(0, 7) || []).reduce((sum, val) => sum + (val || 0), 0);
    // Average 7-day past max temperature
    const pastTemps = (daily.temperature_2m_max.slice(0, 7) || []).filter((t) => t !== null);
    const avgMaxTemp = pastTemps.length ? pastTemps.reduce((sum, t) => sum + t, 0) / pastTemps.length : 32.0;

    // Current / 24h average relative humidity
    const recentHumidity = (hourly?.relative_humidity_2m?.slice(-24) || []).filter((h) => h !== null);
    const avgHumidity = recentHumidity.length ? recentHumidity.reduce((sum, h) => sum + h, 0) / recentHumidity.length : 55.0;

    // Wind speed
    const maxWind = (daily.wind_speed_10m_max?.slice(0, 7) || []).filter((w) => w !== null);
    const avgWind = maxWind.length ? maxWind.reduce((sum, w) => sum + w, 0) / maxWind.length : 12.0;

    // 7-day forecast summary
    const forecastRain = (daily.precipitation_sum.slice(7, 14) || []).reduce((sum, val) => sum + (val || 0), 0);
    const forecastTemps = (daily.temperature_2m_max.slice(7, 14) || []).filter((t) => t !== null);
    const forecastAvgTemp = forecastTemps.length ? forecastTemps.reduce((sum, t) => sum + t, 0) / forecastTemps.length : avgMaxTemp;

    return {
      rainfall_mm: Math.round(pastRain * 10) / 10,
      temperature_c: Math.round(avgMaxTemp * 10) / 10,
      humidity_pct: Math.round(avgHumidity * 10) / 10,
      wind_speed_kmh: Math.round(avgWind * 10) / 10,
      forecast: {
        rainfall_7d_mm: Math.round(forecastRain * 10) / 10,
        avg_temp_c: Math.round(forecastAvgTemp * 10) / 10,
      },
      source: 'OPEN_METEO_LIVE',
      is_live: true,
      observation_time: new Date().toISOString(),
    };
  } catch (err) {
    logger.warn(`Open-Meteo API unreachable (${err.message}). Using agro-climatic climatology model.`);
    return generateAgroClimaticFallback(latitude, longitude);
  }
}

/**
 * Agro-climatic climatology estimator based on latitude, month/season, and geographic coordinates
 */
function generateAgroClimaticFallback(lat, lng) {
  const month = new Date().getMonth(); // 0 to 11
  const isKharifMonsoon = month >= 5 && month <= 9; // June to October
  const isRabiWinter = month >= 10 || month <= 2; // Nov to March

  // Deterministic geographic hash
  const geoHash = Math.abs(Math.sin(lat * 12.9898 + lng * 78.233));

  let baselineTemp = 32.0;
  let baselineRain = 20.0;
  let baselineHumidity = 55.0;

  if (isKharifMonsoon) {
    baselineTemp = 30.0 + geoHash * 5.0;
    baselineRain = 45.0 + geoHash * 80.0;
    baselineHumidity = 75.0 + geoHash * 15.0;
  } else if (isRabiWinter) {
    baselineTemp = 24.0 + geoHash * 8.0;
    baselineRain = 2.0 + geoHash * 15.0;
    baselineHumidity = 45.0 + geoHash * 20.0;
  } else {
    // Summer (Zaid)
    baselineTemp = 37.0 + geoHash * 6.0;
    baselineRain = 5.0 + geoHash * 10.0;
    baselineHumidity = 30.0 + geoHash * 15.0;
  }

  return {
    rainfall_mm: Math.round(baselineRain * 10) / 10,
    temperature_c: Math.round(baselineTemp * 10) / 10,
    humidity_pct: Math.round(baselineHumidity * 10) / 10,
    wind_speed_kmh: Math.round((10 + geoHash * 12) * 10) / 10,
    forecast: {
      rainfall_7d_mm: Math.round((baselineRain * 0.9) * 10) / 10,
      avg_temp_c: Math.round(baselineTemp * 10) / 10,
    },
    source: 'AGRO_CLIMATOLOGY_FALLBACK',
    is_live: false,
    observation_time: new Date().toISOString(),
    disclaimer: 'Meteorological values synthesized from Indian agro-climatic seasonal baselines for this coordinate.',
  };
}

module.exports = { fetchWeather, generateAgroClimaticFallback };
