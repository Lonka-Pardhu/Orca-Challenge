import { useState, useEffect, useCallback, useRef } from 'react';

export interface Vessel {
  mmsi: string;
  name: string | null;
  latitude: number;
  longitude: number;
  course: number | null;
  speed: number | null;
  heading: number | null;
  updatedAt: number;
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
  fetchVessels: (bounds: ViewportBounds) => Promise<void>;
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

  const fetchVessels = useCallback(async (bounds: ViewportBounds) => {
    boundsRef.current = bounds;

    if (!enabled) {
      console.log('[useVessels] Fetch skipped - not enabled');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        minLat: bounds.minLat.toString(),
        maxLat: bounds.maxLat.toString(),
        minLon: bounds.minLon.toString(),
        maxLon: bounds.maxLon.toString(),
      });

      const url = `${apiUrl}/vessels?${params}`;
      console.log('[useVessels] Fetching:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[useVessels] Response:', data.count, 'vessels from server');

      // Filter out vessels older than 2 minutes (client-side double-check)
      const twoMinutesAgo = Date.now() - 120000;
      const freshVessels = data.vessels.filter(
        (v: Vessel) => v.updatedAt >= twoMinutesAgo
      );

      console.log('[useVessels] After freshness filter:', freshVessels.length, 'vessels');
      setVessels(freshVessels);
      setLastUpdated(Date.now());
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch vessels';
      console.log('[useVessels] Error:', errorMsg);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, enabled]);

  // Set up polling
  useEffect(() => {
    if (!enabled || !boundsRef.current) return;

    // Initial fetch
    fetchVessels(boundsRef.current);

    // Set up interval for polling
    intervalRef.current = setInterval(() => {
      if (boundsRef.current) {
        fetchVessels(boundsRef.current);
      }
    }, pollingInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, pollingInterval, fetchVessels]);

  return {
    vessels,
    isLoading,
    error,
    lastUpdated,
    fetchVessels,
  };
}
