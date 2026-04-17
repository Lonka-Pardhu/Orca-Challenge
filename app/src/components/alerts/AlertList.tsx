import React from "react";
import { View, Text, Modal, ScrollView, Pressable as RNPressable } from "react-native";
import { Ship, Clock, Compass, X, ChevronRight } from "lucide-react-native";
import type { ProximityAlert } from "@/hooks/useAlerts";

interface AlertListProps {
  alerts: ProximityAlert[];
  onClose: () => void;
}

function degreeToCardinal(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function cpaColor(cpa: number): string {
  if (cpa < 0.5) return "#ef4444"; // red
  if (cpa < 1) return "#f97316"; // orange
  return "#22c55e"; // green
}

export function AlertList({ alerts, onClose }: AlertListProps) {
  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
        <View
          className="mt-auto rounded-t-2xl"
          style={{ backgroundColor: "#0c1d33", maxHeight: "70%" }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-white/10 px-5 py-4">
            <Text className="text-lg font-bold text-white">
              Proximity Alerts
            </Text>
            <RNPressable
              onPress={onClose}
              style={{
                padding: 6,
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.1)",
              }}
            >
              <X size={20} color="#ffffff" />
            </RNPressable>
          </View>

          {/* List */}
          <ScrollView className="px-4 py-3" style={{ flexGrow: 0 }}>
            {alerts.length === 0 ? (
              <View className="items-center py-12">
                <Ship size={36} color="#6b7280" />
                <Text className="mt-3 text-sm text-gray-400">
                  No vessels approaching
                </Text>
              </View>
            ) : (
              alerts.map((alert) => (
                <View
                  key={alert.mmsi}
                  className="mb-3 rounded-xl p-4"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                >
                  {/* Vessel name */}
                  <View className="mb-2 flex-row items-center">
                    <Ship size={16} color="#93c5fd" />
                    <Text className="ml-2 flex-1 text-sm font-semibold text-white">
                      {alert.vesselName || `Unknown (${alert.mmsi})`}
                    </Text>
                    <ChevronRight size={16} color="#6b7280" />
                  </View>

                  {/* Stats row */}
                  <View className="flex-row items-center gap-4">
                    {/* CPA */}
                    <View className="flex-row items-center">
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: cpaColor(alert.cpa),
                          marginRight: 6,
                        }}
                      />
                      <Text
                        className="text-xs font-medium"
                        style={{ color: cpaColor(alert.cpa) }}
                      >
                        CPA {alert.cpa.toFixed(2)} NM
                      </Text>
                    </View>

                    {/* TCPA */}
                    <View className="flex-row items-center">
                      <Clock size={12} color="#9ca3af" />
                      <Text className="ml-1 text-xs text-gray-300">
                        {alert.tcpa.toFixed(0)} min
                      </Text>
                    </View>

                    {/* Bearing */}
                    <View className="flex-row items-center">
                      <Compass size={12} color="#9ca3af" />
                      <Text className="ml-1 text-xs text-gray-300">
                        {degreeToCardinal(alert.bearing)} ({Math.round(alert.bearing)}°)
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
