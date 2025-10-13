/**
 * Open-Meteo Weather Service
 *
 * Fetches weather data from Open-Meteo API (free, no API key required)
 * Documentation: https://open-meteo.com/en/docs
 */

import axios from 'axios';

// Istanbul coordinates
const ISTANBUL_LAT = 41.01;
const ISTANBUL_LON = 28.94;

// Open-Meteo API endpoints
const CURRENT_WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const HISTORICAL_WEATHER_URL = 'https://archive-api.open-meteo.com/v1/archive';

/**
 * Weather data parameters we fetch
 * - temperature_2m: Temperature at 2 meters height (°C)
 * - windspeed_10m: Wind speed at 10 meters height (km/h)
 * - winddirection_10m: Wind direction at 10 meters height (degrees)
 * - direct_radiation: Direct solar radiation (W/m²)
 * - precipitation: Precipitation amount (mm)
 * - cloudcover: Cloud cover percentage (%)
 * - relativehumidity_2m: Relative humidity at 2 meters (%)
 */
const WEATHER_PARAMS = [
  'temperature_2m',
  'windspeed_10m',
  'winddirection_10m',
  'direct_radiation',
  'precipitation',
  'cloudcover',
  'relativehumidity_2m'
].join(',');

interface WeatherDataPoint {
  date: string;
  hour: string;
  temperature: number;
  windspeed: number;
  winddirection: number;
  direct_radiation: number;
  precipitation: number;
  cloudcover: number;
  humidity: number;
  city: string;
  latitude: number;
  longitude: number;
}

/**
 * Parse ISO timestamp to separate date and hour
 * Example: "2024-10-12T14:00" -> { date: "2024-10-12T00:00:00+03:00", hour: "14:00" }
 */
const parseTimestamp = (timestamp: string): { date: string; hour: string } => {
  const date = new Date(timestamp);
  const dateStr = date.toISOString().split('T')[0] + 'T00:00:00+03:00';
  const hourStr = String(date.getHours()).padStart(2, '0') + ':00';
  return { date: dateStr, hour: hourStr };
};

/**
 * Fetch historical weather data from Open-Meteo
 * @param startDate YYYY-MM-DD format
 * @param endDate YYYY-MM-DD format
 * @param city City name (default: Istanbul)
 */
export const getHistoricalWeather = async (
  startDate: string,
  endDate: string,
  city: string = 'Istanbul'
): Promise<WeatherDataPoint[]> => {
  try {
    // For now, we only support Istanbul
    const latitude = ISTANBUL_LAT;
    const longitude = ISTANBUL_LON;

    const url = `${HISTORICAL_WEATHER_URL}?` +
      `latitude=${latitude}&` +
      `longitude=${longitude}&` +
      `start_date=${startDate}&` +
      `end_date=${endDate}&` +
      `hourly=${WEATHER_PARAMS}&` +
      `timezone=Europe/Istanbul`;

    console.log(`🌤️  Fetching weather data: ${startDate} to ${endDate}`);

    const response = await axios.get(url, {
      timeout: 30000 // 30 second timeout
    });

    const hourly = response.data.hourly;

    if (!hourly || !hourly.time) {
      throw new Error('No weather data received from Open-Meteo');
    }

    // Transform API response to our data structure
    const weatherData: WeatherDataPoint[] = [];

    for (let i = 0; i < hourly.time.length; i++) {
      const { date, hour } = parseTimestamp(hourly.time[i]);

      weatherData.push({
        date,
        hour,
        temperature: hourly.temperature_2m[i] ?? 0,
        windspeed: hourly.windspeed_10m[i] ?? 0,
        winddirection: hourly.winddirection_10m[i] ?? 0,
        direct_radiation: hourly.direct_radiation[i] ?? 0,
        precipitation: hourly.precipitation[i] ?? 0,
        cloudcover: hourly.cloudcover[i] ?? 0,
        humidity: hourly.relativehumidity_2m[i] ?? 0,
        city,
        latitude,
        longitude
      });
    }

    console.log(`🌤️  Weather data fetched: ${weatherData.length} hourly records`);
    return weatherData;

  } catch (error: any) {
    console.error('Error fetching weather data from Open-Meteo:', error.message);
    throw new Error(`Failed to fetch weather data: ${error.message}`);
  }
};

/**
 * Fetch current and forecast weather data (7 days)
 * This uses the free forecast API
 */
export const getCurrentWeather = async (
  city: string = 'Istanbul'
): Promise<WeatherDataPoint[]> => {
  try {
    const latitude = ISTANBUL_LAT;
    const longitude = ISTANBUL_LON;

    const url = `${CURRENT_WEATHER_URL}?` +
      `latitude=${latitude}&` +
      `longitude=${longitude}&` +
      `hourly=${WEATHER_PARAMS}&` +
      `timezone=Europe/Istanbul&` +
      `forecast_days=1`; // Only get today

    console.log(`🌤️  Fetching current weather for ${city}`);

    const response = await axios.get(url, {
      timeout: 10000 // 10 second timeout
    });

    const hourly = response.data.hourly;

    if (!hourly || !hourly.time) {
      throw new Error('No weather data received from Open-Meteo');
    }

    // Transform API response to our data structure
    const weatherData: WeatherDataPoint[] = [];

    for (let i = 0; i < hourly.time.length; i++) {
      const { date, hour } = parseTimestamp(hourly.time[i]);

      weatherData.push({
        date,
        hour,
        temperature: hourly.temperature_2m[i] ?? 0,
        windspeed: hourly.windspeed_10m[i] ?? 0,
        winddirection: hourly.winddirection_10m[i] ?? 0,
        direct_radiation: hourly.direct_radiation[i] ?? 0,
        precipitation: hourly.precipitation[i] ?? 0,
        cloudcover: hourly.cloudcover[i] ?? 0,
        humidity: hourly.relativehumidity_2m[i] ?? 0,
        city,
        latitude,
        longitude
      });
    }

    console.log(`🌤️  Current weather fetched: ${weatherData.length} hourly records`);
    return weatherData;

  } catch (error: any) {
    console.error('Error fetching current weather from Open-Meteo:', error.message);
    throw new Error(`Failed to fetch current weather: ${error.message}`);
  }
};

export type { WeatherDataPoint };
