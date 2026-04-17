import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { ActivityIndicator, Dimensions, Pressable as RNPressable, Alert, View, Text } from "react-native";
import { Crosshair, Navigation } from "lucide-react-native";
import Mapbox, { Camera, MapView, type MapState } from "@rnmapbox/maps";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useVessels, type Vessel } from "@/hooks/useVessels";
import { VesselLayer } from "@/components/VesselLayer";
import { useMapLayers } from "@/hooks/useMapLayers";
import { NauticalChartLayer } from "@/components/map/NauticalChartLayer";
import { LayerPicker } from "@/components/map/LayerPicker";
import { VesselDetailSheet } from "@/components/vessel/VesselDetailSheet";
import { useRouting } from "@/hooks/useRouting";
import { useSavedRoutes } from "@/hooks/useSavedRoutes";
import { RouteOverlay } from "@/components/map/RouteOverlay";
import { RoutePlanningBar } from "@/components/route/RoutePlanningBar";
import { useAlerts } from "@/hooks/useAlerts";
import { AlertBanner } from "@/components/alerts/AlertBanner";
import { AlertList } from "@/components/alerts/AlertList";

// Backend API URL - change this to your server's IP if testing on device
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

console.log("[MapScreen] API URL:", API_URL);

// Default center (Rotterdam/Netherlands - busiest shipping area)
const DEFAULT_CENTER = [5.0, 52.0]; // [longitude, latitude]
const DEFAULT_ZOOM = 12;

interface ViewportBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

const { width, height } = Dimensions.get("window");

export default function MapScreen() {
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(
    null,
  );
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const mapRef = useRef<MapView>(null);
  const cameraRef = useRef<Camera>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [userPosition, setUserPosition] = useState<{ lat: number; lon: number } | null>(null);
  const [alertsDismissed, setAlertsDismissed] = useState(false);
  const [alertsExpanded, setAlertsExpanded] = useState(false);

  const [layers, layerActions] = useMapLayers();
  const routing = useRouting();
  const { saveRoute } = useSavedRoutes();

  // Watch user position for proximity alerts
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          setUserPosition({
            lat: location.coords.latitude,
            lon: location.coords.longitude,
          });
        },
      );
    })();

    return () => {
      subscription?.remove();
    };
  }, []);

  const { alerts, dangerAlerts } = useAlerts({
    lat: userPosition?.lat ?? null,
    lon: userPosition?.lon ?? null,
    course: 0,
    speed: 5,
    enabled: userPosition !== null,
  });

  // Reset dismissed state when danger alerts change
  useEffect(() => {
    if (dangerAlerts.length > 0) {
      setAlertsDismissed(false);
    }
  }, [dangerAlerts.length]);

  const mapStyleURL = useMemo(() => {
    switch (layers.mapStyle) {
      case "satellite":
        return Mapbox.StyleURL.SatelliteStreet;
      case "nautical":
        return Mapbox.StyleURL.Street;
      case "standard":
      default:
        return Mapbox.StyleURL.Street;
    }
  }, [layers.mapStyle]);

  // Poll every 3s to meet "max 10s delay from backend to map" requirement
  const { vessels, isLoading, error, lastUpdated, fetchVessels } = useVessels({
    apiUrl: API_URL,
    pollingInterval: 3000,
    enabled: viewportBounds !== null,
  });

  // Log when vessels change
  useEffect(() => {
    console.log("[MapScreen] Vessels updated:", vessels.length, "vessels");
  }, [vessels]);

  // Log errors
  useEffect(() => {
    if (error) {
      console.log("[MapScreen] Error:", error);
    }
  }, [error]);

  // Log selected vessel
  useEffect(() => {
    if (selectedVessel) {
      console.log("[MapScreen] Selected vessel:", selectedVessel.name, selectedVessel.mmsi);
    }
  }, [selectedVessel]);

  const centerOnUser = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      const location = await Location.getCurrentPositionAsync({});
      cameraRef.current?.setCamera({
        centerCoordinate: [location.coords.longitude, location.coords.latitude],
        zoomLevel: 14,
        animationDuration: 1000,
      });
    }
  }, []);

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
          console.log("[MapScreen] Zoom changed:", zoom.toFixed(1));

          const { ne, sw } = state.properties.bounds;
          const newBounds: ViewportBounds = {
            minLon: sw[0],
            maxLon: ne[0],
            minLat: sw[1],
            maxLat: ne[1],
          };
          console.log(
            "[MapScreen] Fetching vessels for bounds:",
            newBounds,
          );
          setViewportBounds(newBounds);
          fetchVessels(newBounds);
        } catch (err) {
          console.error("Error getting map state:", err);
        }
      }, 300);
    },
    [fetchVessels],
  );

  const handleMapPress = useCallback(
    (e: any) => {
      if (routing.isPlanning && e.geometry) {
        const [lon, lat] = e.geometry.coordinates;
        routing.addWaypoint(lat, lon);
      }
    },
    [routing.isPlanning, routing.addWaypoint],
  );

  const handleSaveRoute = useCallback(async () => {
    if (routing.route.waypoints.length < 2) return;

    Alert.prompt(
      "Save Route",
      "Enter a name for this route:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async (name?: string) => {
            const routeName = name?.trim() || `Route ${new Date().toLocaleDateString()}`;
            await saveRoute(routeName, routing.route.waypoints);
            routing.stopPlanning();
          },
        },
      ],
      "plain-text",
      routing.route.name || "",
    );
  }, [routing.route.waypoints, routing.route.name, saveRoute, routing.stopPlanning]);

  const handleUndoWaypoint = useCallback(() => {
    if (routing.route.waypoints.length > 0) {
      routing.removeWaypoint(routing.route.waypoints.length - 1);
    }
  }, [routing.route.waypoints.length, routing.removeWaypoint]);

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return "Never";
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  return (
    <View className="flex-1 bg-gray-100">
      <MapView
        ref={mapRef}
        style={{ flex: 1, width, height }}
        styleURL={mapStyleURL}
        onCameraChanged={handleRegionChange}
        onPress={handleMapPress}
        logoEnabled={false}
        attributionEnabled={false}
        scaleBarEnabled={false}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: DEFAULT_CENTER,
            zoomLevel: DEFAULT_ZOOM,
          }}
        />
        <NauticalChartLayer
          showNOAA={layers.nauticalCharts}
          showOpenSeaMap={layers.openSeaMap}
        />
        <Mapbox.UserLocation visible={true} />
        <VesselLayer
          vessels={vessels}
          onVesselPress={setSelectedVessel}
          vesselTypes={layers.vesselTypes}
        />
        <RouteOverlay
          waypoints={routing.route.waypoints}
          isPlanning={routing.isPlanning}
        />
      </MapView>

      {/* Status overlay */}
      <SafeAreaView
        style={{ position: "absolute", top: 0, left: 0, right: 0 }}
        pointerEvents="none"
      >
        <View className="mx-4 mt-4 rounded-lg bg-white/95 p-3 shadow-sm">
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-xs font-medium text-gray-800">
              Zoom: {currentZoom.toFixed(1)}
            </Text>
            {routing.isPlanning && (
              <Text className="text-xs font-medium text-blue-500">
                Tap map to add waypoints
              </Text>
            )}
          </View>

          {!routing.isPlanning && (
            <View className="mb-1 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                {isLoading && (
                  <ActivityIndicator size="small" color="#3b82f6" />
                )}
                <Text className="text-xs font-medium text-gray-800">
                  {vessels.length} vessels
                </Text>
              </View>
              <Text className="text-xs font-medium text-gray-800">
                Updated: {formatTime(lastUpdated)}
              </Text>
            </View>
          )}

          {error && !routing.isPlanning && (
            <View className="mt-2 rounded bg-red-500/20 p-2">
              <Text className="text-[11px] text-red-500">{error}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Proximity alert banner — below status overlay */}
      {!alertsDismissed && dangerAlerts.length > 0 && !routing.isPlanning && (
        <View style={{ position: "absolute", top: 120, left: 0, right: 0, zIndex: 10 }}>
          <AlertBanner
            alerts={dangerAlerts}
            onDismiss={() => setAlertsDismissed(true)}
            onExpand={() => setAlertsExpanded(true)}
          />
        </View>
      )}

      {/* Proximity alert list modal */}
      {alertsExpanded && (
        <AlertList
          alerts={alerts}
          onClose={() => setAlertsExpanded(false)}
        />
      )}

      {/* Layer picker — hidden when planning */}
      {!routing.isPlanning && (
        <LayerPicker
          layers={layers}
          onToggleMapStyle={layerActions.setMapStyle}
          onToggleLayer={layerActions.toggleLayer}
          onToggleVesselType={layerActions.toggleVesselType}
        />
      )}

      {/* Floating buttons — hidden when planning */}
      {!routing.isPlanning && (
        <View className="absolute bottom-28 right-4" pointerEvents="box-none">
          {/* Plan Route button */}
          <RNPressable
            style={{
              height: 48,
              width: 48,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 24,
              backgroundColor: "#3b82f6",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
              marginBottom: 12,
            }}
            onPress={routing.startPlanning}
          >
            <Navigation size={22} color="#ffffff" />
          </RNPressable>

          {/* Center on user location button */}
          <RNPressable
            style={{
              height: 48,
              width: 48,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 24,
              backgroundColor: "#ffffff",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
            onPress={centerOnUser}
          >
            <Crosshair size={22} color="#1f2937" />
          </RNPressable>
        </View>
      )}

      {/* Route planning bar */}
      {routing.isPlanning && (
        <RoutePlanningBar
          route={routing.route}
          onSave={handleSaveRoute}
          onCancel={routing.stopPlanning}
          onUndo={handleUndoWaypoint}
        />
      )}

      {/* Vessel detail bottom sheet */}
      {!routing.isPlanning && (
        <VesselDetailSheet
          vessel={selectedVessel}
          onClose={() => setSelectedVessel(null)}
        />
      )}
    </View>
  );
}
