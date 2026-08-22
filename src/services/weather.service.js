const axios = require('axios');

/**
 * Fetches recent rainfall and temperature for a given lat/lng using Open-Meteo.
 * No API key required.
 */
async function fetchWeather(lat, lng) {
  const url = 'https://api.open-meteo.com/v1/forecast';
  const params = {
    latitude: lat,
    longitude: lng,
    daily: 'precipitation_sum,temperature_2m_max',
    past_days: 7,
    forecast_days: 1,
    timezone: 'auto',
  };

  const response = await axios.get(url, { params });
  const daily = response.data.daily;

  // Sum last 7 days rainfall, average max temperature
  const rainfall_mm = daily.precipitation_sum.reduce((sum, val) => sum + (val || 0), 0);
  const temps = daily.temperature_2m_max.filter(t => t !== null);
  const temperature_c = temps.reduce((sum, t) => sum + t, 0) / temps.length;

  return {
    rainfall_mm: Math.round(rainfall_mm * 100) / 100,
    temperature_c: Math.round(temperature_c * 100) / 100,
  };
}

module.exports = { fetchWeather };