import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

export interface TideStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distance: number;
}

export interface TidePrediction {
  time: string;
  height: number;
  type: "high" | "low";
}

export interface TideResponse {
  station: TideStation | null;
  predictions: TidePrediction[];
}

interface UseTidesOptions {
  lat: number | null;
  lon: number | null;
  enabled?: boolean;
}

export interface UseTidesResult {
  tides: TideResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

export function useTides({
  lat,
  lon,
  enabled = true,
}: UseTidesOptions): UseTidesResult {
  const [tides, setTides] = useState<TideResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTides = useCallback(async () => {
    if (lat === null || lon === null || !enabled) return;

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

      const response = await fetch(`${API_URL}/tides?${params}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data: TideResponse = await response.json();
      setTides(data);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Failed to fetch tides";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [lat, lon, enabled]);

  useEffect(() => {
    if (!enabled || lat === null || lon === null) return;

    fetchTides();

    intervalRef.current = setInterval(fetchTides, REFRESH_INTERVAL);

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchTides, enabled, lat, lon]);

  const refresh = useCallback(() => {
    fetchTides();
  }, [fetchTides]);

  return { tides, isLoading, error, refresh };
}
