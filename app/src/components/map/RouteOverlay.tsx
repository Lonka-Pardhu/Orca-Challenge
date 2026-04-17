import React, { useMemo } from "react";
import Mapbox from "@rnmapbox/maps";
import type { Waypoint } from "@/hooks/useRouting";

interface RouteOverlayProps {
  waypoints: Waypoint[];
  isPlanning: boolean;
}

export function RouteOverlay({ waypoints, isPlanning }: RouteOverlayProps) {
  const lineGeoJSON = useMemo(() => {
    if (waypoints.length < 2) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: waypoints.map((wp) => [wp.lon, wp.lat]),
      },
    };
  }, [waypoints]);

  const pointsGeoJSON = useMemo(() => {
    if (waypoints.length === 0) return null;
    return {
      type: "FeatureCollection" as const,
      features: waypoints.map((wp, i) => ({
        type: "Feature" as const,
        properties: { index: i + 1 },
        geometry: {
          type: "Point" as const,
          coordinates: [wp.lon, wp.lat],
        },
      })),
    };
  }, [waypoints]);

  if (waypoints.length === 0) return null;

  return (
    <>
      {/* Route line */}
      {lineGeoJSON && (
        <Mapbox.ShapeSource id="route-line-source" shape={lineGeoJSON}>
          <Mapbox.LineLayer
            id="route-line-layer"
            style={{
              lineColor: "#3b82f6",
              lineWidth: 3,
              lineDasharray: [2, 2],
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        </Mapbox.ShapeSource>
      )}

      {/* Waypoint markers */}
      {pointsGeoJSON && (
        <Mapbox.ShapeSource id="route-points-source" shape={pointsGeoJSON}>
          <Mapbox.CircleLayer
            id="route-points-circle"
            style={{
              circleRadius: 10,
              circleColor: "#3b82f6",
              circleStrokeWidth: 2,
              circleStrokeColor: "#ffffff",
            }}
          />
          <Mapbox.SymbolLayer
            id="route-points-label"
            style={{
              textField: ["get", "index"],
              textSize: 11,
              textColor: "#ffffff",
              textAllowOverlap: true,
              textIgnorePlacement: true,
              textFont: ["DIN Pro Medium", "Arial Unicode MS Regular"],
            }}
          />
        </Mapbox.ShapeSource>
      )}
    </>
  );
}
