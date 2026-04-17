import React from "react";
import Mapbox from "@rnmapbox/maps";

interface NauticalChartLayerProps {
  showNOAA: boolean;
  showOpenSeaMap: boolean;
}

export function NauticalChartLayer({
  showNOAA,
  showOpenSeaMap,
}: NauticalChartLayerProps) {
  return (
    <>
      {showNOAA && (
        <Mapbox.RasterSource
          id="noaa-charts"
          tileUrlTemplates={[
            "https://tileservice.charts.noaa.gov/tiles/50000_1/{z}/{x}/{y}.png",
          ]}
          tileSize={256}
        >
          <Mapbox.RasterLayer
            id="noaa-charts-layer"
            style={{ rasterOpacity: 0.7 }}
          />
        </Mapbox.RasterSource>
      )}
      {showOpenSeaMap && (
        <Mapbox.RasterSource
          id="opensea-marks"
          tileUrlTemplates={[
            "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
          ]}
          tileSize={256}
        >
          <Mapbox.RasterLayer
            id="opensea-marks-layer"
            style={{ rasterOpacity: 0.8 }}
          />
        </Mapbox.RasterSource>
      )}
    </>
  );
}
