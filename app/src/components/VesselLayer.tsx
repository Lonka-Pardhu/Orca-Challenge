import React, { useMemo } from "react";
import Mapbox from "@rnmapbox/maps";
import type { Vessel } from "../hooks/useVessels";
import type { MapLayerState } from "../hooks/useMapLayers";

interface VesselLayerProps {
  vessels: Vessel[];
  onVesselPress?: (vessel: Vessel | null) => void;
  vesselTypes?: MapLayerState["vesselTypes"];
}

// AIS ship type codes (ITU-R M.1371) → our category
// https://help.marinetraffic.com/hc/en-us/articles/205579997-What-is-the-significance-of-the-AIS-Shiptype-number-
function categorizeShipType(shipType: number | null | undefined): string {
  if (shipType == null) return "other";
  if (shipType >= 30 && shipType <= 39) return "fishing";
  if (shipType >= 40 && shipType <= 49) return "highSpeed";
  if (shipType === 50) return "tug"; // Pilot vessel
  if (shipType === 52 || shipType === 53) return "tug";
  if (shipType >= 60 && shipType <= 69) return "passenger";
  if (shipType >= 70 && shipType <= 79) return "cargo";
  if (shipType >= 80 && shipType <= 89) return "tanker";
  if (shipType === 36 || shipType === 37) return "pleasure"; // Sailing/Pleasure craft
  return "other";
}

export function VesselLayer({
  vessels,
  onVesselPress,
  vesselTypes,
}: VesselLayerProps) {
  const geojson = useMemo<GeoJSON.FeatureCollection>(() => {
    const filtered = vesselTypes
      ? vessels.filter((v) => {
          const cat = categorizeShipType(
            v.shipType,
          ) as keyof MapLayerState["vesselTypes"];
          return vesselTypes[cat] !== false;
        })
      : vessels;

    return {
      type: "FeatureCollection",
      features: filtered.map((v) => ({
        type: "Feature" as const,
        id: v.mmsi,
        geometry: {
          type: "Point" as const,
          coordinates: [v.longitude, v.latitude],
        },
        properties: {
          mmsi: v.mmsi,
          name: v.name ?? "",
          course: v.course ?? 0,
          speed: v.speed ?? 0,
          category: categorizeShipType(v.shipType),
        },
      })),
    };
  }, [vessels, vesselTypes]);

  if (geojson.features.length === 0) return null;

  return (
    <Mapbox.ShapeSource
      id="vesselSource"
      shape={geojson}
      onPress={(e) => {
        const feature = e.features[0];
        if (feature?.properties) {
          const mmsi = feature.properties.mmsi;
          const vessel = vessels.find((v) => v.mmsi === mmsi) ?? null;
          onVesselPress?.(vessel);
        }
      }}
    >
      <Mapbox.SymbolLayer
        id="vesselArrows"
        style={{
          textField: "\u27A4", // ➤ right-pointing arrowhead
          textFont: ["Arial Unicode MS Regular"],
          // Scale arrow size based on zoom: smaller when zoomed out
          textSize: [
            "interpolate",
            ["linear"],
            ["zoom"],
            2,
            6,
            6,
            9,
            10,
            13,
            14,
            18,
            18,
            24,
          ],
          textColor: [
            "match",
            ["get", "category"],
            "cargo",
            "#22c55e", // green
            "tanker",
            "#ef4444", // red
            "passenger",
            "#3b82f6", // blue
            "fishing",
            "#f97316", // orange
            "pleasure",
            "#ec4899", // pink
            "tug",
            "#06b6d4", // cyan
            "highSpeed",
            "#eab308", // yellow
            /* default */ "#9ca3af", // gray
          ],
          textHaloColor: "#0c1d33",
          textHaloWidth: 0.3,
          textRotate: ["-", ["get", "course"], 90], // arrow ➤ points right (90°), subtract 90 so course=0 points up (north)
          textAllowOverlap: true,
          textIgnorePlacement: true,
          textRotationAlignment: "map",
        }}
      />
    </Mapbox.ShapeSource>
  );
}
