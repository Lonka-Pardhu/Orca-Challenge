import { useState, useEffect, useCallback, useRef } from "react";

export interface Vessel {
  mmsi: string;
  name: string | null;
  latitude: number;
  longitude: number;
  course: number | null;
  speed: number | null;
  heading: number | null;
  updatedAt: number;
  shipType?: number | null;
}

interface ViewportBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

interface UseVesselsOptions {
  apiUrl: string;
  pollingInterval?: number;
  enabled?: boolean;
}

interface UseVesselsResult {
  vessels: Vessel[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  fetchVessels: (bounds: ViewportBounds) => void;
}

export function useVessels({
  apiUrl,
  pollingInterval = 5000,
  enabled = true,
}: UseVesselsOptions): UseVesselsResult {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const boundsRef = useRef<ViewportBounds | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enabledRef = useRef(enabled);
  const apiUrlRef = useRef(apiUrl);
  const fetchingRef = useRef(false);

  // Keep refs in sync
  enabledRef.current = enabled;
  apiUrlRef.current = apiUrl;

  const doFetch = useCallback(async (bounds: ViewportBounds) => {
    if (!enabledRef.current || fetchingRef.current) return;

    fetchingRef.current = true;
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        minLat: bounds.minLat.toString(),
        maxLat: bounds.maxLat.toString(),
        minLon: bounds.minLon.toString(),
        maxLon: bounds.maxLon.toString(),
      });

      const url = `${apiUrlRef.current}/vessels?${params}`;
      console.log("[useVessels] Fetching:", url);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        "[useVessels] Response:",
        data.count,
        "vessels from server",
      );

      // Only show vessels updated in the past 2 minutes
      const DISPLAY_FRESHNESS_MS = 2 * 60 * 1000;
      const freshVessels = data.vessels.filter(
        (v: Vessel) => v.updatedAt >= Date.now() - DISPLAY_FRESHNESS_MS,
      );

      console.log(
        "[useVessels] After freshness filter:",
        freshVessels.length,
        "vessels",
      );
      setVessels(freshVessels);
      setLastUpdated(Date.now());
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("[useVessels] Request timed out");
        setError("Request timed out");
      } else {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to fetch vessels";
        console.log("[useVessels] Error:", errorMsg);
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // Called by the map when viewport changes
  const fetchVessels = useCallback(
    (bounds: ViewportBounds) => {
      boundsRef.current = bounds;
      doFetch(bounds);
    },
    [doFetch],
  );

  // Set up polling — only depends on enabled and pollingInterval
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Set up interval for polling
    intervalRef.current = setInterval(() => {
      if (boundsRef.current && enabledRef.current) {
        doFetch(boundsRef.current);
      }
    }, pollingInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, pollingInterval, doFetch]);

  return {
    vessels,
    isLoading,
    error,
    lastUpdated,
    fetchVessels,
  };
}
