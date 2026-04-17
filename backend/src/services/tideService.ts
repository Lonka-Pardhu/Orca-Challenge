import { TidePrediction, TideResponse } from "../types";

interface NOAAStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

// In-memory cache for tide stations
let stationCache: NOAAStation[] = [];
let stationCacheFetchedAt = 0;
const STATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Haversine distance between two points in km.
 */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fetch and cache the list of NOAA tide prediction stations.
 */
async function getStations(): Promise<NOAAStation[]> {
  const now = Date.now();
  if (stationCache.length > 0 && now - stationCacheFetchedAt < STATION_CACHE_TTL_MS) {
    return stationCache;
  }

  console.log("[Tides] Fetching NOAA tide station list...");
  try {
    const url =
      "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions";
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`NOAA stations API returned ${res.status}`);
    }
    const data = (await res.json()) as {
      stations?: Array<{ id: string; name: string; lat: number; lng: number }>;
    };

    if (!data.stations || !Array.isArray(data.stations)) {
      throw new Error("Unexpected NOAA stations response format");
    }

    stationCache = data.stations.map((s) => ({
      id: s.id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
    }));
    stationCacheFetchedAt = now;
    console.log(`[Tides] Cached ${stationCache.length} tide stations`);
    return stationCache;
  } catch (err) {
    console.error("[Tides] Failed to fetch station list:", err);
    // Return stale cache if available
    if (stationCache.length > 0) return stationCache;
    return [];
  }
}

/**
 * Find the nearest NOAA tide station within maxDistKm.
 */
function findNearest(
  lat: number,
  lon: number,
  stations: NOAAStation[],
  maxDistKm: number,
): { station: NOAAStation; distance: number } | null {
  let best: NOAAStation | null = null;
  let bestDist = Infinity;

  for (const s of stations) {
    const d = haversineKm(lat, lon, s.lat, s.lng);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }

  if (!best || bestDist > maxDistKm) return null;
  return { station: best, distance: Math.round(bestDist * 10) / 10 };
}

/**
 * Format a date as YYYYMMDD for the NOAA API.
 */
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * Get tide predictions for a given location.
 * Uses NOAA CO-OPS API (US waters only). Returns empty if no station within 100km.
 */
export async function getTidePredictions(
  lat: number,
  lon: number,
): Promise<TideResponse> {
  const stations = await getStations();

  if (stations.length === 0) {
    console.warn("[Tides] No stations available");
    return { station: null, predictions: [] };
  }

  const nearest = findNearest(lat, lon, stations, 100);
  if (!nearest) {
    console.log(
      `[Tides] No tide station within 100km of (${lat}, ${lon})`,
    );
    return { station: null, predictions: [] };
  }

  const { station, distance } = nearest;
  console.log(
    `[Tides] Nearest station: ${station.name} (${station.id}), ${distance}km away`,
  );

  try {
    const today = formatDate(new Date());
    const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${today}&range=48&station=${station.id}&product=predictions&datum=MLLW&units=metric&time_zone=gmt&interval=hilo&format=json&application=SeaTrack`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`NOAA predictions API returned ${res.status}`);
    }

    const data = (await res.json()) as {
      predictions?: Array<{ t: string; v: string; type: string }>;
      error?: { message: string };
    };

    if (data.error) {
      console.warn(`[Tides] NOAA API error: ${data.error.message}`);
      return {
        station: {
          id: station.id,
          name: station.name,
          lat: station.lat,
          lon: station.lng,
          distance,
        },
        predictions: [],
      };
    }

    if (!data.predictions || !Array.isArray(data.predictions)) {
      return {
        station: {
          id: station.id,
          name: station.name,
          lat: station.lat,
          lon: station.lng,
          distance,
        },
        predictions: [],
      };
    }

    const predictions: TidePrediction[] = data.predictions.map((p) => ({
      time: p.t,
      height: parseFloat(p.v),
      type: p.type === "H" ? ("high" as const) : ("low" as const),
    }));

    return {
      station: {
        id: station.id,
        name: station.name,
        lat: station.lat,
        lon: station.lng,
        distance,
      },
      predictions,
    };
  } catch (err) {
    console.error("[Tides] Failed to fetch predictions:", err);
    return {
      station: {
        id: station.id,
        name: station.name,
        lat: station.lat,
        lon: station.lng,
        distance,
      },
      predictions: [],
    };
  }
}
