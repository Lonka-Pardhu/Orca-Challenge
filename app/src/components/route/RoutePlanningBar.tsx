import React from "react";
import { View, Text, Pressable as RNPressable } from "react-native";
import { Undo2, Save, X } from "lucide-react-native";
import type { RouteState } from "@/hooks/useRouting";

interface RoutePlanningBarProps {
  route: RouteState;
  onSave: () => void;
  onCancel: () => void;
  onUndo: () => void;
}

function formatDistance(nm: number): string {
  if (nm < 0.01) return "0 NM";
  if (nm < 10) return `${nm.toFixed(1)} NM`;
  return `${Math.round(nm)} NM`;
}

function formatTime(minutes: number | null): string | null {
  if (minutes === null) return null;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `~${m}m`;
  return `~${h}h ${m}m`;
}

export function RoutePlanningBar({
  route,
  onSave,
  onCancel,
  onUndo,
}: RoutePlanningBarProps) {
  const timeStr = formatTime(route.estimatedTime);

  return (
    <View
      className="absolute bottom-20 left-0 right-0"
      style={{ zIndex: 20 }}
    >
      <View
        className="mx-3 flex-row items-center justify-between rounded-2xl px-4 py-3"
        style={{ backgroundColor: "#0c1d33" }}
      >
        {/* Stats */}
        <View className="flex-1 flex-col">
          <Text className="text-base font-bold text-white">
            {formatDistance(route.totalDistance)}
          </Text>
          <View className="flex-row items-center gap-3">
            <Text className="text-xs text-[#6b8bb5]">
              {route.waypoints.length}{" "}
              {route.waypoints.length === 1 ? "waypoint" : "waypoints"}
            </Text>
            {timeStr && (
              <Text className="text-xs text-[#6b8bb5]">{timeStr}</Text>
            )}
          </View>
        </View>

        {/* Action buttons */}
        <View className="flex-row items-center gap-2">
          <RNPressable
            style={{
              height: 38,
              width: 38,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 19,
              backgroundColor: "rgba(255,255,255,0.1)",
            }}
            onPress={onUndo}
            disabled={route.waypoints.length === 0}
          >
            <Undo2
              size={18}
              color={route.waypoints.length === 0 ? "#4b5563" : "#ffffff"}
            />
          </RNPressable>

          <RNPressable
            style={{
              height: 38,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 19,
              backgroundColor:
                route.waypoints.length < 2
                  ? "rgba(59,130,246,0.3)"
                  : "#3b82f6",
              gap: 6,
            }}
            onPress={onSave}
            disabled={route.waypoints.length < 2}
          >
            <Save size={16} color="#ffffff" />
            <Text
              style={{
                color: "#ffffff",
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              Save
            </Text>
          </RNPressable>

          <RNPressable
            style={{
              height: 38,
              width: 38,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 19,
              backgroundColor: "rgba(239,68,68,0.2)",
            }}
            onPress={onCancel}
          >
            <X size={18} color="#ef4444" />
          </RNPressable>
        </View>
      </View>
    </View>
  );
}
