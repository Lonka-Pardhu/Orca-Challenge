import React from "react";
import { View, Text, Pressable as RNPressable } from "react-native";
import { AlertTriangle, X } from "lucide-react-native";
import type { ProximityAlert } from "@/hooks/useAlerts";

interface AlertBannerProps {
  alerts: ProximityAlert[];
  onDismiss: () => void;
  onExpand: () => void;
}

export function AlertBanner({ alerts, onDismiss, onExpand }: AlertBannerProps) {
  if (alerts.length === 0) return null;

  // Find the closest vessel (smallest CPA)
  const closest = alerts.reduce((min, a) => (a.cpa < min.cpa ? a : min), alerts[0]);
  const vesselLabel = closest.vesselName || `MMSI ${closest.mmsi}`;

  return (
    <View className="mx-4 mt-2 overflow-hidden rounded-lg" pointerEvents="box-none">
      <RNPressable
        onPress={onExpand}
        style={{
          backgroundColor: "#e85d5d",
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 8,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <AlertTriangle size={18} color="#ffffff" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text className="text-sm font-semibold text-white">
            {alerts.length} vessel{alerts.length !== 1 ? "s" : ""} approaching
          </Text>
          <Text className="text-xs text-white/90">
            {vesselLabel} — CPA {closest.cpa.toFixed(1)} NM in{" "}
            {closest.tcpa.toFixed(0)} min
          </Text>
        </View>
        <RNPressable
          onPress={(e) => {
            e.stopPropagation?.();
            onDismiss();
          }}
          style={{
            padding: 4,
            marginLeft: 8,
          }}
        >
          <X size={18} color="#ffffff" />
        </RNPressable>
      </RNPressable>
    </View>
  );
}
