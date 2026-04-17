import React, { useState } from "react";
import { Modal, Switch, Platform, Pressable as RNPressable, View, Text, ScrollView } from "react-native";
import { Layers, X, Map, Satellite, Anchor } from "lucide-react-native";
import type { MapLayerState } from "@/hooks/useMapLayers";

interface LayerPickerProps {
  layers: MapLayerState;
  onToggleMapStyle: (style: MapLayerState["mapStyle"]) => void;
  onToggleLayer: (
    layer: keyof Omit<MapLayerState, "mapStyle" | "vesselTypes">
  ) => void;
  onToggleVesselType: (type: keyof MapLayerState["vesselTypes"]) => void;
}

const MAP_STYLES: { key: MapLayerState["mapStyle"]; label: string }[] = [
  { key: "standard", label: "Standard" },
  { key: "satellite", label: "Satellite" },
  { key: "nautical", label: "Nautical" },
];

const OVERLAY_LAYERS: {
  key: keyof Omit<MapLayerState, "mapStyle" | "vesselTypes">;
  label: string;
  subtitle: string;
}[] = [
  { key: "nauticalCharts", label: "Nautical Charts", subtitle: "NOAA" },
  { key: "openSeaMap", label: "OpenSeaMap Markers", subtitle: "Global" },
  {
    key: "weatherOverlay",
    label: "Weather Overlay",
    subtitle: "Coming soon",
  },
];

const VESSEL_TYPES: {
  key: keyof MapLayerState["vesselTypes"];
  label: string;
  color: string;
}[] = [
  { key: "cargo", label: "Cargo", color: "#22c55e" },
  { key: "tanker", label: "Tankers", color: "#ef4444" },
  { key: "passenger", label: "Passenger", color: "#3b82f6" },
  { key: "fishing", label: "Fishing", color: "#f97316" },
  { key: "pleasure", label: "Pleasure Craft", color: "#ec4899" },
  { key: "tug", label: "Tugs", color: "#06b6d4" },
  { key: "highSpeed", label: "High Speed", color: "#eab308" },
  { key: "other", label: "Other", color: "#9ca3af" },
];

function ToggleRow({
  label,
  subtitle,
  value,
  onToggle,
  dotColor,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onToggle: () => void;
  dotColor?: string;
}) {
  return (
    <View className="flex-row items-center justify-between py-2.5">
      <View className="flex-1 flex-row items-center gap-2.5">
        {dotColor && (
          <View
            style={{ backgroundColor: dotColor, width: 10, height: 10, borderRadius: 5 }}
          />
        )}
        <View>
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#ffffff" }}>{label}</Text>
          {subtitle && (
            <Text style={{ fontSize: 12, color: "#9ca3af" }}>{subtitle}</Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#374151", true: "#3b82f6" }}
        thumbColor={Platform.OS === "android" ? "#ffffff" : undefined}
        ios_backgroundColor="#374151"
      />
    </View>
  );
}

export function LayerPicker({
  layers,
  onToggleMapStyle,
  onToggleLayer,
  onToggleVesselType,
}: LayerPickerProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      {/* Floating layers button */}
      <RNPressable
        style={{
          position: "absolute",
          right: 16,
          top: 112,
          zIndex: 10,
          height: 44,
          width: 44,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 22,
          backgroundColor: "#ffffff",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
        }}
        onPress={() => setVisible(true)}
      >
        <Layers size={20} color="#1f2937" />
      </RNPressable>

      {/* Layer picker modal */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <RNPressable
          style={{ flex: 1 }}
          onPress={() => setVisible(false)}
        >
          <View
            className="absolute bottom-0 left-0 right-0 top-0"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          />
        </RNPressable>

        <View
          className="absolute bottom-6 left-4 right-4 rounded-2xl p-5"
          style={{ backgroundColor: "#0c1d33", maxHeight: "75%" }}
        >
          {/* Header */}
          <View className="mb-4 flex-row items-center justify-between">
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#ffffff" }}>
              Map Layers
            </Text>
            <RNPressable
              style={{
                height: 32,
                width: 32,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.1)",
              }}
              onPress={() => setVisible(false)}
            >
              <X size={16} color="#ffffff" />
            </RNPressable>
          </View>

          <ScrollView className="flex-1">
            {/* Map Style Section */}
            <Text
              style={{
                marginBottom: 8,
                fontSize: 12,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "#9ca3af",
              }}
            >
              Map Style
            </Text>
            <View className="mb-5 flex-row gap-3">
              {MAP_STYLES.map((s) => {
                const selected = layers.mapStyle === s.key;
                return (
                  <RNPressable
                    key={s.key}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      borderRadius: 12,
                      paddingVertical: 12,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? "#3b82f6" : "#4b5563",
                      backgroundColor: selected ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)",
                    }}
                    onPress={() => onToggleMapStyle(s.key)}
                  >
                    <View className="mb-1">
                      {s.key === "standard" ? (
                        <Map size={24} color={selected ? "#60a5fa" : "#d1d5db"} />
                      ) : s.key === "satellite" ? (
                        <Satellite size={24} color={selected ? "#60a5fa" : "#d1d5db"} />
                      ) : (
                        <Anchor size={24} color={selected ? "#60a5fa" : "#d1d5db"} />
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "500",
                        color: selected ? "#60a5fa" : "#d1d5db",
                      }}
                    >
                      {s.label}
                    </Text>
                  </RNPressable>
                );
              })}
            </View>

            {/* Overlay Toggles Section */}
            <Text
              style={{
                marginBottom: 8,
                fontSize: 12,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "#9ca3af",
              }}
            >
              Overlays
            </Text>
            <View className="mb-5">
              {OVERLAY_LAYERS.map((layer) => (
                <ToggleRow
                  key={layer.key}
                  label={layer.label}
                  subtitle={layer.subtitle}
                  value={layers[layer.key]}
                  onToggle={() => onToggleLayer(layer.key)}
                />
              ))}
            </View>

            {/* Vessel Type Filters Section */}
            <Text
              style={{
                marginBottom: 8,
                fontSize: 12,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "#9ca3af",
              }}
            >
              Vessel Types
            </Text>
            <View className="mb-2">
              {VESSEL_TYPES.map((vt) => (
                <ToggleRow
                  key={vt.key}
                  label={vt.label}
                  value={layers.vesselTypes[vt.key]}
                  onToggle={() => onToggleVesselType(vt.key)}
                  dotColor={vt.color}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
