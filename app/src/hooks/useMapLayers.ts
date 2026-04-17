import { useState, useCallback, useMemo } from "react";

export interface MapLayerState {
  // Map style
  mapStyle: "standard" | "satellite" | "nautical";

  // Overlay layers
  nauticalCharts: boolean;
  openSeaMap: boolean;
  weatherOverlay: boolean;

  // Vessel type filters (all on by default)
  vesselTypes: {
    cargo: boolean;
    tanker: boolean;
    passenger: boolean;
    fishing: boolean;
    pleasure: boolean;
    tug: boolean;
    highSpeed: boolean;
    other: boolean;
  };
}

export interface MapLayerActions {
  setMapStyle: (style: MapLayerState["mapStyle"]) => void;
  toggleLayer: (
    layer: keyof Omit<MapLayerState, "mapStyle" | "vesselTypes">
  ) => void;
  toggleVesselType: (type: keyof MapLayerState["vesselTypes"]) => void;
}

const DEFAULT_STATE: MapLayerState = {
  mapStyle: "standard",
  nauticalCharts: false,
  openSeaMap: false,
  weatherOverlay: false,
  vesselTypes: {
    cargo: true,
    tanker: true,
    passenger: true,
    fishing: true,
    pleasure: true,
    tug: true,
    highSpeed: true,
    other: true,
  },
};

export function useMapLayers(): [MapLayerState, MapLayerActions] {
  const [state, setState] = useState<MapLayerState>(DEFAULT_STATE);

  const setMapStyle = useCallback(
    (style: MapLayerState["mapStyle"]) => {
      setState((prev) => {
        // When switching to nautical, auto-enable nautical charts
        if (style === "nautical") {
          return { ...prev, mapStyle: style, nauticalCharts: true };
        }
        return { ...prev, mapStyle: style };
      });
    },
    []
  );

  const toggleLayer = useCallback(
    (layer: keyof Omit<MapLayerState, "mapStyle" | "vesselTypes">) => {
      setState((prev) => ({ ...prev, [layer]: !prev[layer] }));
    },
    []
  );

  const toggleVesselType = useCallback(
    (type: keyof MapLayerState["vesselTypes"]) => {
      setState((prev) => ({
        ...prev,
        vesselTypes: {
          ...prev.vesselTypes,
          [type]: !prev.vesselTypes[type],
        },
      }));
    },
    []
  );

  const actions = useMemo(
    () => ({ setMapStyle, toggleLayer, toggleVesselType }),
    [setMapStyle, toggleLayer, toggleVesselType]
  );

  return [state, actions];
}
