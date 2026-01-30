import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import Mapbox, { Camera, MapView, type MapState } from '@rnmapbox/maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVessels } from '../hooks/useVessels';
import { VesselLayer } from '../components/VesselLayer';

// Backend API URL - change this to your server's IP if testing on device
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

console.log('[MapScreen] API URL:', API_URL);

// Minimum zoom level to show vessels
const MIN_VESSEL_ZOOM = 12;

// Default center (Rotterdam/Netherlands - busiest shipping area)
const DEFAULT_CENTER = [5.0, 52.0]; // [longitude, latitude]
const DEFAULT_ZOOM = 12;

interface ViewportBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export default function MapScreen() {
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(null);
  const mapRef = useRef<MapView>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shouldShowVessels = currentZoom >= MIN_VESSEL_ZOOM;

  const { vessels, isLoading, error, lastUpdated, fetchVessels } = useVessels({
    apiUrl: API_URL,
    pollingInterval: 5000,
    enabled: shouldShowVessels && viewportBounds !== null,
  });

  // Log when vessels change
  useEffect(() => {
    console.log('[MapScreen] Vessels updated:', vessels.length, 'vessels');
  }, [vessels]);

  // Log errors
  useEffect(() => {
    if (error) {
      console.log('[MapScreen] Error:', error);
    }
  }, [error]);

  const handleRegionChange = useCallback(
    (state: MapState) => {
      // Debounce region changes
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(async () => {
        try {
          const zoom = state.properties.zoom;
          setCurrentZoom(zoom);
          console.log('[MapScreen] Zoom changed:', zoom.toFixed(1));

          if (zoom >= MIN_VESSEL_ZOOM) {
            const { ne, sw } = state.properties.bounds;
            const newBounds: ViewportBounds = {
              minLon: sw[0],
              maxLon: ne[0],
              minLat: sw[1],
              maxLat: ne[1],
            };
            console.log('[MapScreen] Fetching vessels for bounds:', newBounds);
            setViewportBounds(newBounds);
            fetchVessels(newBounds);
          }
        } catch (err) {
          console.error('Error getting map state:', err);
        }
      }, 300);
    },
    [fetchVessels]
  );

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        styleURL={Mapbox.StyleURL.Street}
        onCameraChanged={handleRegionChange}
        logoEnabled={false}
        attributionEnabled={false}
        scaleBarEnabled={false}
      >
        <Camera
          defaultSettings={{
            centerCoordinate: DEFAULT_CENTER,
            zoomLevel: DEFAULT_ZOOM,
          }}
        />
        {shouldShowVessels && <VesselLayer vessels={vessels} minZoom={MIN_VESSEL_ZOOM} />}
      </MapView>

      {/* Status overlay */}
      <SafeAreaView style={styles.overlay} pointerEvents="none">
        <View style={styles.statusContainer}>
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>
              Zoom: {currentZoom.toFixed(1)}
            </Text>
            {currentZoom < MIN_VESSEL_ZOOM && (
              <Text style={styles.zoomHint}>
                Zoom in to see vessels (level {MIN_VESSEL_ZOOM}+)
              </Text>
            )}
          </View>

          {shouldShowVessels && (
            <View style={styles.statusRow}>
              <View style={styles.vesselCount}>
                {isLoading && <ActivityIndicator size="small" color="#3b82f6" />}
                <Text style={styles.statusText}>
                  {vessels.length} vessels
                </Text>
              </View>
              <Text style={styles.statusText}>
                Updated: {formatTime(lastUpdated)}
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  map: {
    flex: 1,
    width: width,
    height: height,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  statusContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusText: {
    color: '#1f2937',
    fontSize: 12,
    fontWeight: '500',
  },
  zoomHint: {
    color: '#d97706',
    fontSize: 12,
    fontWeight: '500',
  },
  vesselCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 11,
  },
});
