import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

export interface ProximityAlert {
  mmsi: string;
  vesselName: string | null;
  cpa: number; // nautical miles
  tcpa: number; // minutes
  bearing: number; // degrees
}

interface UseAlertsOptions {
  lat: number | null;
  lon: number | null;
  course: number;
  speed: number;
  enabled: boolean;
}

interface UseAlertsResult {
  alerts: ProximityAlert[];
  dangerAlerts: ProximityAlert[];
  isLoading: boolean;
  error: string | null;
}

const POLL_INTERVAL = 10000; // 10 seconds

export function useAlerts({
  lat,
  lon,
  course,
  speed,
  enabled,
}: UseAlertsOptions): UseAlertsResult {
  const [alerts, setAlerts] = useState<ProximityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabledRef = useRef(enabled);
  const fetchingRef = useRef(false);
  enabledRef.current = enabled;

  const doFetch = useCallback(
    async (latitude: number, longitude: number) => {
      if (!enabledRef.current || fetchingRef.current) return;

      fetchingRef.current = true;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams({
          lat: latitude.toString(),
          lon: longitude.toString(),
          course: course.toString(),
          speed: speed.toString(),
        });

        const url = `${API_URL}/alerts/proximity?${params}`;
        console.log("[useAlerts] Fetching:", url);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();
        console.log("[useAlerts] Got", data.alerts?.length ?? 0, "alerts");
        setAlerts(data.alerts ?? []);
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === "AbortError") {
          console.log("[useAlerts] Request timed out");
          setError("Request timed out");
        } else {
          const errorMsg =
            err instanceof Error ? err.message : "Failed to fetch alerts";
          console.log("[useAlerts] Error:", errorMsg);
          setError(errorMsg);
        }
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    },
    [course, speed],
  );

  useEffect(() => {
    if (!enabled || lat == null || lon == null) {
      setAlerts([]);
      return;
    }

    // Initial fetch
    doFetch(lat, lon);

    const interval = setInterval(() => {
      if (lat != null && lon != null && enabledRef.current) {
        doFetch(lat, lon);
      }
    }, POLL_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, lat, lon, doFetch]);

  const dangerAlerts = useMemo(
    () => alerts.filter((a) => a.cpa < 0.5 && a.tcpa < 30),
    [alerts],
  );

  return {
    alerts,
    dangerAlerts,
    isLoading,
    error,
  };
}
