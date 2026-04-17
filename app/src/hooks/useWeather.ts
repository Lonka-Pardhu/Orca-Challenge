import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

export interface WeatherData {
  wind: { speed: number; gust: number; direction: number };
  waves: { height: number; period: number; direction: number };
  temperature: { air: number; sea: number };
  pressure: number;
  visibility: number;
}

export interface HourlyForecastPoint {
  time: string;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  visibility: number;
  weatherCode: number;
  waveHeight: number | null;
  waveDirection: number | null;
  wavePeriod: number | null;
}

export interface WeatherResponse {
  current: WeatherData;
  hourly: HourlyForecastPoint[];
  location: { lat: number; lon: number };
  timestamp: number;
}

interface UseWeatherOptions {
  lat: number | null;
  lon: number | null;
  enabled?: boolean;
}

export interface UseWeatherResult {
  weather: WeatherResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

export function useWeather({
  lat,
  lon,
  enabled = true,
}: UseWeatherOptions): UseWeatherResult {
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchWeather = useCallback(async () => {
    if (lat === null || lon === null || !enabled) return;

    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
      });

      const response = await fetch(`${API_URL}/weather?${params}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data: WeatherResponse = await response.json();
      setWeather(data);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Failed to fetch weather";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [lat, lon, enabled]);

  // Fetch on mount and when coords change
  useEffect(() => {
    if (!enabled || lat === null || lon === null) return;

    fetchWeather();

    intervalRef.current = setInterval(fetchWeather, REFRESH_INTERVAL);

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchWeather, enabled, lat, lon]);

  const refresh = useCallback(() => {
    fetchWeather();
  }, [fetchWeather]);

  return { weather, isLoading, error, refresh };
}
