import { WeatherData, HourlyForecastPoint } from "../types";
import { getWeatherCacheCollection } from "../db";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function roundCoord(val: number): number {
  return Math.round(val * 100) / 100;
}

function cacheKey(prefix: string, lat: number, lon: number): string {
  return `${prefix}:${roundCoord(lat)}:${roundCoord(lon)}`;
}

interface CachedEntry {
  _id: string;
  data: unknown;
  fetchedAt: Date;
}

async function getCached<T>(key: string): Promise<T | null> {
  try {
    const col = getWeatherCacheCollection();
    const doc = (await col.findOne({ _id: key })) as CachedEntry | null;
    if (!doc) return null;
    // Check TTL manually as well (in case TTL index hasn't cleaned up yet)
    if (Date.now() - doc.fetchedAt.getTime() > CACHE_TTL_MS) return null;
    return doc.data as T;
  } catch {
    return null;
  }
}

async function setCache(key: string, data: unknown): Promise<void> {
  try {
    const col = getWeatherCacheCollection();
    await col.updateOne(
      { _id: key },
      { $set: { data, fetchedAt: new Date() } },
      { upsert: true },
    );
  } catch (err) {
    console.error("[WeatherCache] Failed to write cache:", err);
  }
}

interface OpenMeteoWeatherResponse {
  current?: {
    temperature_2m?: number;
    surface_pressure?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    wind_gusts_10m?: number;
    visibility?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    wind_speed_10m?: number[];
    wind_direction_10m?: number[];
    wind_gusts_10m?: number[];
    visibility?: number[];
    weather_code?: number[];
  };
}

interface OpenMeteoMarineResponse {
  current?: {
    wave_height?: number;
    wave_direction?: number;
    wave_period?: number;
    sea_surface_temperature?: number;
  };
  hourly?: {
    time?: string[];
    wave_height?: number[];
    wave_direction?: number[];
    wave_period?: number[];
  };
}

interface WeatherResult {
  current: WeatherData;
  hourly: HourlyForecastPoint[];
}

async function fetchFromAPIs(
  lat: number,
  lon: number,
): Promise<WeatherResult> {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,weather_code&forecast_days=2&timezone=auto`;
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height,wave_direction,wave_period,ocean_current_velocity,ocean_current_direction,sea_surface_temperature&hourly=wave_height,wave_direction,wave_period&forecast_days=2&timezone=auto`;

  console.log(`[Weather] Fetching weather for (${lat}, ${lon})`);

  const [weatherRes, marineRes] = await Promise.allSettled([
    fetch(weatherUrl).then((r) => r.json() as Promise<OpenMeteoWeatherResponse>),
    fetch(marineUrl).then((r) => r.json() as Promise<OpenMeteoMarineResponse>),
  ]);

  const weather =
    weatherRes.status === "fulfilled" ? weatherRes.value : ({} as OpenMeteoWeatherResponse);
  const marine =
    marineRes.status === "fulfilled" ? marineRes.value : ({} as OpenMeteoMarineResponse);

  if (weatherRes.status === "rejected") {
    console.warn("[Weather] Weather API failed:", weatherRes.reason);
  }
  if (marineRes.status === "rejected") {
    console.warn("[Weather] Marine API failed:", marineRes.reason);
  }

  const wc = weather.current || {};
  const mc = marine.current || {};

  const current: WeatherData = {
    wind: {
      speed: wc.wind_speed_10m ?? 0,
      gust: wc.wind_gusts_10m ?? 0,
      direction: wc.wind_direction_10m ?? 0,
    },
    waves: {
      height: mc.wave_height ?? 0,
      period: mc.wave_period ?? 0,
      direction: mc.wave_direction ?? 0,
    },
    temperature: {
      air: wc.temperature_2m ?? 0,
      sea: mc.sea_surface_temperature ?? 0,
    },
    pressure: wc.surface_pressure ?? 1013.25,
    // Open-Meteo returns visibility in meters, convert to km
    visibility: wc.visibility != null ? wc.visibility / 1000 : 10,
  };

  // Build hourly forecast (up to 48 hours)
  const wh = weather.hourly || {};
  const mh = marine.hourly || {};
  const times = wh.time || [];
  const hourly: HourlyForecastPoint[] = [];

  const maxPoints = Math.min(times.length, 48);
  for (let i = 0; i < maxPoints; i++) {
    hourly.push({
      time: times[i],
      temperature: wh.temperature_2m?.[i] ?? 0,
      windSpeed: wh.wind_speed_10m?.[i] ?? 0,
      windDirection: wh.wind_direction_10m?.[i] ?? 0,
      windGust: wh.wind_gusts_10m?.[i] ?? 0,
      visibility: wh.visibility?.[i] != null ? (wh.visibility![i] / 1000) : 10,
      weatherCode: wh.weather_code?.[i] ?? 0,
      waveHeight: mh.wave_height?.[i] ?? null,
      waveDirection: mh.wave_direction?.[i] ?? null,
      wavePeriod: mh.wave_period?.[i] ?? null,
    });
  }

  return { current, hourly };
}

/**
 * Get current weather data for a given location.
 * Uses Open-Meteo Weather + Marine APIs with MongoDB caching.
 */
export async function getWeather(
  lat: number,
  lon: number,
): Promise<WeatherData> {
  const result = await getWeatherFull(lat, lon);
  return result.current;
}

/**
 * Get current weather + hourly forecast for a location.
 */
export async function getWeatherFull(
  lat: number,
  lon: number,
): Promise<WeatherResult> {
  const key = cacheKey("weather", lat, lon);

  // Check cache
  const cached = await getCached<WeatherResult>(key);
  if (cached) {
    console.log(`[Weather] Cache hit for ${key}`);
    return cached;
  }

  // Fetch from APIs
  const result = await fetchFromAPIs(lat, lon);

  // Store in cache
  await setCache(key, result);

  return result;
}

/**
 * Get hourly forecast for a location (next 48 hours).
 */
export async function getHourlyForecast(
  lat: number,
  lon: number,
): Promise<HourlyForecastPoint[]> {
  const result = await getWeatherFull(lat, lon);
  return result.hourly;
}
