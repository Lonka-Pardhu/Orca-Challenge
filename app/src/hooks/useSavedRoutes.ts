import { useState, useEffect, useCallback } from "react";
import type { Waypoint } from "./useRouting";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

export interface SavedRoute {
  _id: string;
  name: string;
  waypoints: Waypoint[];
  createdAt: number;
  updatedAt?: number;
}

export interface UseSavedRoutesResult {
  routes: SavedRoute[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  saveRoute: (name: string, waypoints: Waypoint[]) => Promise<SavedRoute | null>;
  deleteRoute: (id: string) => Promise<boolean>;
}

export function useSavedRoutes(): UseSavedRoutesResult {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/routes`);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      const data = await response.json();
      setRoutes(data.routes ?? data ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch routes";
      console.log("[useSavedRoutes] Error fetching:", msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const saveRoute = useCallback(
    async (name: string, waypoints: Waypoint[]): Promise<SavedRoute | null> => {
      try {
        const response = await fetch(`${API_URL}/routes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, waypoints }),
        });
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        const saved: SavedRoute = await response.json();
        setRoutes((prev) => [saved, ...prev]);
        return saved;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to save route";
        console.log("[useSavedRoutes] Error saving:", msg);
        setError(msg);
        return null;
      }
    },
    []
  );

  const deleteRoute = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/routes/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      setRoutes((prev) => prev.filter((r) => r._id !== id));
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete route";
      console.log("[useSavedRoutes] Error deleting:", msg);
      setError(msg);
      return false;
    }
  }, []);

  return {
    routes,
    isLoading,
    error,
    refresh: fetchRoutes,
    saveRoute,
    deleteRoute,
  };
}
