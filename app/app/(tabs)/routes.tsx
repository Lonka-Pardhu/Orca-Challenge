import React, { useCallback } from "react";
import {
  Pressable as RNPressable,
  FlatList,
  ActivityIndicator,
  Alert,
  View,
  Text,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Navigation, Trash2, MapPin, Anchor } from "lucide-react-native";
import { useSavedRoutes, type SavedRoute } from "@/hooks/useSavedRoutes";

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDistance(nm: number): string {
  if (nm < 10) return `${nm.toFixed(1)} NM`;
  return `${Math.round(nm)} NM`;
}

function calculateDistance(waypoints: { lat: number; lon: number }[]): number {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const R = 3440.065;
    const dLat = ((waypoints[i].lat - waypoints[i - 1].lat) * Math.PI) / 180;
    const dLon = ((waypoints[i].lon - waypoints[i - 1].lon) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((waypoints[i - 1].lat * Math.PI) / 180) *
        Math.cos((waypoints[i].lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    total += R * c;
  }
  return total;
}

function RouteCard({
  route,
  onDelete,
}: {
  route: SavedRoute;
  onDelete: () => void;
}) {
  const distance = calculateDistance(route.waypoints);

  return (
    <View style={s.card}>
      <View style={s.cardRow}>
        <View style={{ flex: 1 }}>
          <View style={s.nameRow}>
            <Navigation size={16} color="#3b82f6" />
            <Text style={s.routeName}>
              {route.name || "Unnamed Route"}
            </Text>
          </View>
          <View style={s.detailRow}>
            <Text style={s.detailText}>
              {route.waypoints.length} waypoints
            </Text>
            <Text style={s.detailDot}>•</Text>
            <Text style={s.detailText}>
              {formatDistance(distance)}
            </Text>
          </View>
          <Text style={s.dateText}>
            {formatDate(route.createdAt)}
          </Text>
        </View>

        <RNPressable
          style={s.deleteBtn}
          onPress={onDelete}
        >
          <Trash2 size={16} color="#ef4444" />
        </RNPressable>
      </View>
    </View>
  );
}

export default function RoutesScreen() {
  const { routes, isLoading, error, refresh, deleteRoute } = useSavedRoutes();

  const handleDelete = useCallback(
    (id: string, name: string) => {
      Alert.alert("Delete Route", `Delete "${name || "Unnamed Route"}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteRoute(id),
        },
      ]);
    },
    [deleteRoute]
  );

  const renderItem = useCallback(
    ({ item }: { item: SavedRoute }) => (
      <RouteCard
        route={item}
        onDelete={() => handleDelete(item._id, item.name)}
      />
    ),
    [handleDelete]
  );

  const keyExtractor = useCallback((item: SavedRoute) => item._id, []);

  return (
    <View style={s.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>My Routes</Text>
          <RNPressable style={s.refreshBtn} onPress={refresh}>
            <MapPin size={14} color="#3b82f6" />
            <Text style={s.refreshText}>Refresh</Text>
          </RNPressable>
        </View>

        {/* Info banner */}
        <View style={s.banner}>
          <Anchor size={18} color="#3b82f6" />
          <Text style={s.bannerText}>
            Switch to the Map tab and tap the route button to plan a new route.
          </Text>
        </View>

        {/* Error */}
        {error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* Loading */}
        {isLoading && routes.length === 0 && (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        )}

        {/* Route list */}
        {!isLoading && routes.length === 0 ? (
          <View style={s.center}>
            <Navigation size={48} color="#4b6a8f" />
            <Text style={s.emptyTitle}>No saved routes yet</Text>
            <Text style={s.emptySubtitle}>
              Plan a route on the map to see it here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={routes}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0c1d33",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
  },
  refreshBtn: {
    height: 36,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(59,130,246,0.15)",
    gap: 6,
  },
  refreshText: {
    color: "#3b82f6",
    fontSize: 13,
    fontWeight: "600",
  },
  banner: {
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(59,130,246,0.1)",
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    color: "#6b8bb5",
  },
  errorBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: "rgba(239,68,68,0.2)",
    padding: 12,
  },
  errorText: {
    fontSize: 12,
    color: "#f87171",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
    color: "#6b8bb5",
  },
  emptySubtitle: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
    color: "#4b6a8f",
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#1a2d4a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  routeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: "#6b8bb5",
  },
  detailDot: {
    fontSize: 12,
    color: "#4b6a8f",
  },
  dateText: {
    marginTop: 4,
    fontSize: 12,
    color: "#4b6a8f",
  },
  deleteBtn: {
    height: 36,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(239,68,68,0.15)",
  },
});
