import React from 'react';
import { View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import type { Vessel } from '../hooks/useVessels';

interface VesselLayerProps {
  vessels: Vessel[];
  minZoom?: number;
}

// Boat marker component - boat shape with red bow tip
const BoatMarker = () => (
  <View style={{
    width: 20,
    height: 32,
    alignItems: 'center',
  }}>
    {/* Red tip (bow/front) - points in direction of travel */}
    <View style={{
      width: 0,
      height: 0,
      borderLeftWidth: 6,
      borderRightWidth: 6,
      borderBottomWidth: 10,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderBottomColor: '#dc2626',
    }} />
    {/* White hull body with dark outline */}
    <View style={{
      width: 12,
      height: 18,
      backgroundColor: '#ffffff',
      borderWidth: 1.5,
      borderColor: '#1f2937',
      borderTopWidth: 0,
      borderBottomLeftRadius: 6,
      borderBottomRightRadius: 6,
      marginTop: -1,
    }} />
  </View>
);

export function VesselLayer({ vessels, minZoom = 12 }: VesselLayerProps) {
  if (vessels.length === 0) return null;

  return (
    <>
      {vessels.map((vessel) => (
        <Mapbox.MarkerView
          key={vessel.mmsi}
          coordinate={[vessel.longitude, vessel.latitude]}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={{
            transform: [{ rotate: `${vessel.course ?? 0}deg` }],
          }}>
            <BoatMarker />
          </View>
        </Mapbox.MarkerView>
      ))}
    </>
  );
}
