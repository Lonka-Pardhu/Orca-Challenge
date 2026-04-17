import { useState, useCallback, useRef } from "react";

export interface Waypoint {
  lat: number;
  lon: number;
  name?: string;
}

export interface RouteState {
  name: string;
  waypoints: Waypoint[];
  totalDistance: number; // nautical miles
  estimatedTime: number | null; // minutes (if speed provided)
}

export interface UseRoutingResult {
  route: RouteState;
  isPlanning: boolean;
  setName: (name: string) => void;
  addWaypoint: (lat: number, lon: number) => void;
  removeWaypoint: (index: number) => void;
  clearRoute: () => void;
  startPlanning: () => void;
  stopPlanning: () => void;
  setSpeed: (knots: number) => void;
}

function haversineNM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateTotalDistance(waypoints: Waypoint[]): number {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += haversineNM(
      waypoints[i - 1].lat,
      waypoints[i - 1].lon,
      waypoints[i].lat,
      waypoints[i].lon
    );
  }
  return total;
}

const INITIAL_ROUTE: RouteState = {
  name: "",
  waypoints: [],
  totalDistance: 0,
  estimatedTime: null,
};

export function useRouting(): UseRoutingResult {
  const [route, setRoute] = useState<RouteState>(INITIAL_ROUTE);
  const [isPlanning, setIsPlanning] = useState(false);
  const speedRef = useRef<number | null>(null);

  const recalculate = useCallback(
    (waypoints: Waypoint[], speed: number | null): Partial<RouteState> => {
      const totalDistance = calculateTotalDistance(waypoints);
      const estimatedTime =
        speed && speed > 0 ? (totalDistance / speed) * 60 : null;
      return { totalDistance, estimatedTime };
    },
    []
  );

  const setName = useCallback((name: string) => {
    setRoute((prev) => ({ ...prev, name }));
  }, []);

  const addWaypoint = useCallback(
    (lat: number, lon: number) => {
      setRoute((prev) => {
        const waypoints = [...prev.waypoints, { lat, lon }];
        const calc = recalculate(waypoints, speedRef.current);
        return { ...prev, waypoints, ...calc };
      });
    },
    [recalculate]
  );

  const removeWaypoint = useCallback(
    (index: number) => {
      setRoute((prev) => {
        const waypoints = prev.waypoints.filter((_, i) => i !== index);
        const calc = recalculate(waypoints, speedRef.current);
        return { ...prev, waypoints, ...calc };
      });
    },
    [recalculate]
  );

  const clearRoute = useCallback(() => {
    speedRef.current = null;
    setRoute(INITIAL_ROUTE);
  }, []);

  const startPlanning = useCallback(() => {
    setIsPlanning(true);
    setRoute(INITIAL_ROUTE);
    speedRef.current = null;
  }, []);

  const stopPlanning = useCallback(() => {
    setIsPlanning(false);
    setRoute(INITIAL_ROUTE);
    speedRef.current = null;
  }, []);

  const setSpeed = useCallback(
    (knots: number) => {
      speedRef.current = knots;
      setRoute((prev) => {
        const calc = recalculate(prev.waypoints, knots);
        return { ...prev, ...calc };
      });
    },
    [recalculate]
  );

  return {
    route,
    isPlanning,
    setName,
    addWaypoint,
    removeWaypoint,
    clearRoute,
    startPlanning,
    stopPlanning,
    setSpeed,
  };
}
