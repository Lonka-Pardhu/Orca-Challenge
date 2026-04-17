import React, { useRef, useEffect, useMemo, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import type { Vessel } from "@/hooks/useVessels";

interface VesselDetailSheetProps {
  vessel: Vessel | null;
  onClose: () => void;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatCoord(value: number): string {
  return value.toFixed(4);
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoCard}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

export function VesselDetailSheet({ vessel, onClose }: VesselDetailSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["30%", "60%"], []);

  useEffect(() => {
    if (vessel) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [vessel]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  if (!vessel) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onChange={handleSheetChanges}
      backgroundStyle={{ backgroundColor: "#ffffff" }}
      handleIndicatorStyle={{ backgroundColor: "#94a3b8", width: 40 }}
    >
      <BottomSheetView style={s.content}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.vesselName}>
            {vessel.name || "Unknown Vessel"}
          </Text>
          <Text style={s.mmsi}>MMSI: {vessel.mmsi}</Text>
        </View>

        {/* Info Grid */}
        <View style={s.grid}>
          <InfoCard
            label="SPD"
            value={vessel.speed !== null ? `${vessel.speed.toFixed(1)} kn` : "--"}
          />
          <InfoCard
            label="COG"
            value={vessel.course !== null ? `${vessel.course.toFixed(1)}°` : "--"}
          />
          <InfoCard
            label="HDG"
            value={vessel.heading !== null ? `${vessel.heading.toFixed(0)}°` : "--"}
          />
          <InfoCard
            label="POS"
            value={`${formatCoord(vessel.latitude)}, ${formatCoord(vessel.longitude)}`}
          />
        </View>

        {/* Last Updated */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Last updated: {formatTimeAgo(vessel.updatedAt)}
          </Text>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 16,
  },
  vesselName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#172554",
  },
  mmsi: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  infoCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  infoLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 4,
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#172554",
  },
  footer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  footerText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
  },
});
