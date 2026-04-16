/**
 * weather-service.ts
 * Open-Meteo API integration for automatic weather data in field notes (Minutas de Obra).
 * FREE — no API key required.
 */

// ===== TYPES =====

export interface WeatherData {
  temp: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
  icon: string;
}

interface GeocodingResult {
  latitude: number;
  longitude: number;
  name: string;
  country: string;
  admin1?: string;
}

interface OpenMeteoResponse {
  current_weather?: {
    temperature: number;
    windspeed: number;
    weathercode: number;
    time: string;
  };
}

interface GeocodingResponse {
  results?: GeocodingResult[];
}

// ===== WMO WEATHER CODE MAPPING (Spanish) =====

const WMO_CODES: Record<number, { description: string; icon: string }> = {
  0:  { description: 'Despejado', icon: '☀️' },
  1:  { description: 'Principalmente despejado', icon: '🌤️' },
  2:  { description: 'Parcialmente nublado', icon: '⛅' },
  3:  { description: 'Nublado', icon: '☁️' },
  45: { description: 'Niebla', icon: '🌫️' },
  48: { description: 'Niebla con escarcha', icon: '🌫️' },
  51: { description: 'Llovizna ligera', icon: '🌦️' },
  53: { description: 'Llovizna moderada', icon: '🌦️' },
  55: { description: 'Llovizna intensa', icon: '🌧️' },
  56: { description: 'Llovizna helada ligera', icon: '🌧️' },
  57: { description: 'Llovizna helada intensa', icon: '🌧️' },
  61: { description: 'Lluvia ligera', icon: '🌧️' },
  63: { description: 'Lluvia moderada', icon: '🌧️' },
  65: { description: 'Lluvia fuerte', icon: '🌧️' },
  66: { description: 'Lluvia helada ligera', icon: '🌧️' },
  67: { description: 'Lluvia helada fuerte', icon: '🌧️' },
  71: { description: 'Nevada ligera', icon: '🌨️' },
  73: { description: 'Nevada moderada', icon: '🌨️' },
  75: { description: 'Nevada fuerte', icon: '❄️' },
  77: { description: 'Granizo', icon: '🌨️' },
  80: { description: 'Chubascos ligeros', icon: '🌦️' },
  81: { description: 'Chubascos moderados', icon: '🌧️' },
  82: { description: 'Chubascos fuertes', icon: '🌧️' },
  85: { description: 'Chubascos de nieve ligeros', icon: '🌨️' },
  86: { description: 'Chubascos de nieve fuertes', icon: '🌨️' },
  95: { description: 'Tormenta', icon: '⛈️' },
  96: { description: 'Tormenta con granizo ligero', icon: '⛈️' },
  99: { description: 'Tormenta con granizo fuerte', icon: '⛈️' },
};

function mapWeatherCode(code: number): { description: string; icon: string } {
  return WMO_CODES[code] || { description: 'Desconocido', icon: '🌤️' };
}

// ===== IN-MEMORY CACHE (5 min TTL) =====

interface CacheEntry {
  data: WeatherData;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const weatherCache = new Map<string, CacheEntry>();

function getCachedWeather(key: string): WeatherData | null {
  const entry = weatherCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  weatherCache.delete(key);
  return null;
}

function setCachedWeather(key: string, data: WeatherData): void {
  weatherCache.set(key, { data, timestamp: Date.now() });
}

// ===== GEOCODING =====

export async function geocodeCity(cityName: string): Promise<GeocodingResult | null> {
  if (!cityName || cityName.trim().length < 2) return null;

  const cacheKey = `geo:${cityName.trim().toLowerCase()}`;
  const cached = getCachedWeather(cacheKey);
  if (cached) {
    return {
      latitude: (cached as unknown as { lat: number; lon: number }).lat || 0,
      longitude: (cached as unknown as { lat: number; lon: number }).lon || 0,
      name: cityName,
      country: '',
    };
  }

  try {
    const params = new URLSearchParams({
      name: cityName.trim(),
      count: '1',
      language: 'es',
      format: 'json',
    });
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
    if (!res.ok) return null;

    const data: GeocodingResponse = await res.json();
    if (!data.results || data.results.length === 0) return null;

    const result = data.results[0];
    return result;
  } catch (err) {
    console.warn('[ArchiFlow] Weather: geocoding error:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ===== FETCH WEATHER BY COORDINATES =====

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) {
    throw new Error('Coordenadas inválidas');
  }

  const cacheKey = `weather:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = getCachedWeather(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current_weather: 'true',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode',
    timezone: 'auto',
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const data: OpenMeteoResponse = await res.json();
  const cw = data.current_weather;

  if (!cw) {
    throw new Error('No se recibieron datos del clima');
  }

  const { description, icon } = mapWeatherCode(cw.weathercode);

  const weatherData: WeatherData = {
    temp: Math.round(cw.temperature),
    windSpeed: Math.round(cw.windspeed),
    weatherCode: cw.weathercode,
    description,
    icon,
  };

  setCachedWeather(cacheKey, weatherData);
  return weatherData;
}

// ===== FETCH WEATHER BY CITY NAME =====

export async function fetchWeatherForCity(cityName: string): Promise<WeatherData> {
  if (!cityName || cityName.trim().length < 2) {
    throw new Error('Nombre de ciudad vacío');
  }

  const geo = await geocodeCity(cityName);
  if (!geo) {
    throw new Error(`No se encontró: "${cityName}"`);
  }

  return fetchWeather(geo.latitude, geo.longitude);
}

// ===== MAP WEATHER DATA TO FORM VALUES =====
/** Maps Open-Meteo weather description to the existing WEATHER_OPTIONS dropdown values */
export function mapWeatherToFormOption(weatherData: WeatherData): { weather: string; temperature: number } {
  const code = weatherData.weatherCode;
  const desc = weatherData.description.toLowerCase();

  let weather: string;

  if (code === 0 || code === 1 || desc.includes('despejado')) {
    weather = 'Soleado';
  } else if (code === 3 || desc.includes('nublado') && !desc.includes('parcial')) {
    weather = 'Nublado';
  } else if (code >= 61 && code <= 67 || code >= 80 && code <= 82 || desc.includes('lluvia') || desc.includes('llovizna') || desc.includes('chubasco')) {
    weather = 'Lluvioso';
  } else if (code === 2 || desc.includes('parcial')) {
    weather = 'Parcialmente nublado';
  } else if (code >= 95 || desc.includes('tormenta')) {
    weather = 'Tormenta';
  } else {
    // Default mapping for fog, snow, etc.
    weather = 'Parcialmente nublado';
  }

  return {
    weather,
    temperature: weatherData.temp,
  };
}
