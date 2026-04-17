import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from "react-native";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useWeather, type HourlyForecastPoint } from "@/hooks/useWeather";
import { useTides, type TidePrediction } from "@/hooks/useTides";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function degreeToCardinal(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(deg / 45) % 8;
  return dirs[index];
}

function kmhToKnots(kmh: number): number {
  return kmh / 1.852;
}

function weatherCodeToEmoji(code: number): string {
  if (code === 0) return "\u2600\uFE0F";
  if (code <= 3) return "\u26C5";
  if (code <= 48) return "\uD83C\uDF2B\uFE0F";
  if (code <= 55) return "\uD83C\uDF27\uFE0F";
  if (code <= 65) return "\uD83C\uDF27\uFE0F";
  if (code <= 75) return "\uD83C\uDF28\uFE0F";
  if (code <= 82) return "\uD83C\uDF26\uFE0F";
  if (code <= 99) return "\u26C8\uFE0F";
  return "\u2601\uFE0F";
}

function weatherCodeToText(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Fog";
  if (code <= 55) return "Drizzle";
  if (code <= 65) return "Rain";
  if (code <= 75) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatUpdatedTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CurrentConditionsCard({
  temperature,
  weatherCode,
  pressure,
  visibility,
}: {
  temperature: { air: number; sea: number };
  weatherCode: number;
  pressure: number;
  visibility: number;
}) {
  return (
    <View className="mx-4 mb-4 rounded-2xl bg-[#1a2d4a] p-5">
      <View className="items-center">
        <Text className="mb-1 text-6xl">{weatherCodeToEmoji(weatherCode)}</Text>
        <Text className="text-5xl font-bold text-white">
          {Math.round(temperature.air)}\u00B0C
        </Text>
        <Text className="mt-1 text-base text-[#6b8bb5]">
          {weatherCodeToText(weatherCode)}
        </Text>
        <Text className="mt-1 text-sm text-[#6b8bb5]">
          Sea: {temperature.sea.toFixed(1)}\u00B0C
        </Text>
      </View>
      <View className="mt-4 flex-row justify-around">
        <View className="items-center">
          <Text className="text-xs text-[#6b8bb5]">Pressure</Text>
          <Text className="text-sm font-semibold text-white">
            {Math.round(pressure)} hPa
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-xs text-[#6b8bb5]">Visibility</Text>
          <Text className="text-sm font-semibold text-white">
            {(visibility / 1000).toFixed(1)} km
          </Text>
        </View>
      </View>
    </View>
  );
}

function WindCard({
  speed,
  gust,
  direction,
}: {
  speed: number;
  gust: number;
  direction: number;
}) {
  const knots = kmhToKnots(speed);
  const gustKnots = kmhToKnots(gust);
  const cardinal = degreeToCardinal(direction);

  return (
    <View className="mx-4 mb-4 rounded-2xl bg-[#1a2d4a] p-5">
      <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#6b8bb5]">
        Wind
      </Text>
      <View className="flex-row items-center justify-between">
        {/* Wind speed info */}
        <View className="flex-1">
          <Text className="text-3xl font-bold text-white">
            {knots.toFixed(1)} kn
          </Text>
          <Text className="mt-1 text-sm text-[#6b8bb5]">
            Gusts {gustKnots.toFixed(1)} kn
          </Text>
          <Text className="mt-1 text-sm text-[#6b8bb5]">
            From {cardinal} ({Math.round(direction)}\u00B0)
          </Text>
        </View>
        {/* Compass */}
        <View className="h-24 w-24 items-center justify-center">
          <View className="h-20 w-20 items-center justify-center rounded-full border-2 border-[#6b8bb5]/30">
            <Text className="absolute -top-1 text-[10px] font-bold text-[#6b8bb5]">
              N
            </Text>
            <Text className="absolute -bottom-1 text-[10px] font-bold text-[#6b8bb5]">
              S
            </Text>
            <Text className="absolute -left-0.5 text-[10px] font-bold text-[#6b8bb5]">
              W
            </Text>
            <Text className="absolute -right-0.5 text-[10px] font-bold text-[#6b8bb5]">
              E
            </Text>
            <Text
              className="text-2xl text-[#4a9eff]"
              style={{ transform: [{ rotate: `${direction}deg` }] }}
            >
              {"\u2191"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function WaveCard({
  height,
  period,
  direction,
}: {
  height: number;
  period: number;
  direction: number;
}) {
  return (
    <View className="mx-4 mb-4 rounded-2xl bg-[#1a2d4a] p-5">
      <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#6b8bb5]">
        Waves
      </Text>
      <View className="flex-row justify-around">
        <View className="items-center">
          <Text className="text-2xl font-bold text-white">
            {height.toFixed(1)} m
          </Text>
          <Text className="mt-1 text-xs text-[#6b8bb5]">Height</Text>
        </View>
        <View className="items-center">
          <Text className="text-2xl font-bold text-white">
            {period.toFixed(0)} s
          </Text>
          <Text className="mt-1 text-xs text-[#6b8bb5]">Period</Text>
        </View>
        <View className="items-center">
          <Text
            className="text-2xl text-[#4a9eff]"
            style={{ transform: [{ rotate: `${direction}deg` }] }}
          >
            {"\u2191"}
          </Text>
          <Text className="mt-1 text-xs text-[#6b8bb5]">
            {degreeToCardinal(direction)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function TideCard({
  station,
  predictions,
}: {
  station: { name: string; distance: number } | null;
  predictions: TidePrediction[];
}) {
  if (!station) {
    return (
      <View className="mx-4 mb-4 rounded-2xl bg-[#1a2d4a] p-5">
        <Text className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#6b8bb5]">
          Tides
        </Text>
        <Text className="text-center text-sm text-[#6b8bb5]">
          No tide stations nearby
        </Text>
      </View>
    );
  }

  const now = Date.now();
  const upcoming = predictions.filter((p) => new Date(p.time).getTime() > now);
  const next24h = upcoming.slice(0, 8);

  return (
    <View className="mx-4 mb-4 rounded-2xl bg-[#1a2d4a] p-5">
      <Text className="mb-1 text-sm font-semibold uppercase tracking-wider text-[#6b8bb5]">
        Tides
      </Text>
      <Text className="mb-3 text-xs text-[#6b8bb5]">
        {station.name} ({station.distance.toFixed(1)} km away)
      </Text>
      {next24h.length > 0 ? (
        next24h.map((p, i) => (
          <View
            key={i}
            className="flex-row items-center justify-between border-b border-[#6b8bb5]/10 py-2.5"
          >
            <View className="flex-row items-center gap-2">
              <View
                className={`h-7 w-7 items-center justify-center rounded-full ${
                  p.type === "high" ? "bg-[#4a9eff]/20" : "bg-[#6b8bb5]/20"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    p.type === "high" ? "text-[#4a9eff]" : "text-[#6b8bb5]"
                  }`}
                >
                  {p.type === "high" ? "H" : "L"}
                </Text>
              </View>
              <Text className="text-sm font-medium text-white">
                {p.type === "high" ? "High" : "Low"} Tide
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <Text className="text-sm font-semibold text-white">
                {p.height.toFixed(2)} m
              </Text>
              <Text className="text-sm text-[#6b8bb5]">
                {formatTime(p.time)}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <Text className="text-center text-sm text-[#6b8bb5]">
          No upcoming tides
        </Text>
      )}
    </View>
  );
}

function HourlyForecastCard({ point }: { point: HourlyForecastPoint }) {
  return (
    <View className="mr-3 w-20 items-center rounded-xl bg-[#1a2d4a] px-2 py-3">
      <Text className="text-xs text-[#6b8bb5]">{formatTime(point.time)}</Text>
      <Text className="my-1 text-xl">
        {weatherCodeToEmoji(point.weatherCode)}
      </Text>
      <Text className="text-sm font-bold text-white">
        {Math.round(point.temperature)}\u00B0
      </Text>
      <Text className="mt-1 text-[10px] text-[#6b8bb5]">
        {kmhToKnots(point.windSpeed).toFixed(0)} kn
      </Text>
      {point.waveHeight !== null && (
        <Text className="mt-0.5 text-[10px] text-[#4a9eff]">
          {point.waveHeight.toFixed(1)} m
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function WeatherScreen() {
  const [location, setLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Request location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError(
          "Location permission is required to show weather for your area. Please enable it in Settings."
        );
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation({
          lat: loc.coords.latitude,
          lon: loc.coords.longitude,
        });
      } catch {
        setLocationError("Unable to get your location. Please try again.");
      }
    })();
  }, []);

  const {
    weather,
    isLoading: weatherLoading,
    error: weatherError,
    refresh: refreshWeather,
  } = useWeather({
    lat: location?.lat ?? null,
    lon: location?.lon ?? null,
    enabled: location !== null,
  });

  const {
    tides,
    isLoading: tidesLoading,
    error: tidesError,
    refresh: refreshTides,
  } = useTides({
    lat: location?.lat ?? null,
    lon: location?.lon ?? null,
    enabled: location !== null,
  });

  const isLoading = weatherLoading || tidesLoading;
  const error = weatherError || tidesError;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshWeather();
    refreshTides();
    // Give a moment for the requests to fire
    setTimeout(() => setRefreshing(false), 1500);
  }, [refreshWeather, refreshTides]);

  // Derive a simple weather code from the first hourly point when available
  const currentWeatherCode =
    weather?.hourly && weather.hourly.length > 0
      ? weather.hourly[0].weatherCode
      : 0;

  // Next 24 hours of hourly data
  const hourlyData = weather?.hourly?.slice(0, 24) ?? [];

  // -- Permission denied --
  if (locationError) {
    return (
      <View className="flex-1 bg-[#0c1d33]">
        <SafeAreaView style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center px-8">
            <Text className="mb-4 text-4xl">{"\uD83D\uDCCD"}</Text>
            <Text className="mb-2 text-center text-lg font-bold text-white">
              Location Required
            </Text>
            <Text className="text-center text-sm text-[#6b8bb5]">
              {locationError}
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // -- Loading initial data --
  if (!location || (isLoading && !weather)) {
    return (
      <View className="flex-1 bg-[#0c1d33]">
        <SafeAreaView style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#4a9eff" />
            <Text className="mt-4 text-sm text-[#6b8bb5]">
              Fetching weather data...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // -- Error with no data --
  if (error && !weather) {
    return (
      <View className="flex-1 bg-[#0c1d33]">
        <SafeAreaView style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center px-8">
            <Text className="mb-4 text-4xl">{"\u26A0\uFE0F"}</Text>
            <Text className="mb-2 text-center text-lg font-bold text-white">
              Unable to Load Weather
            </Text>
            <Text className="mb-4 text-center text-sm text-[#6b8bb5]">
              {error}
            </Text>
            <Pressable
              className="rounded-lg bg-[#4a9eff] px-6 py-3"
              onPress={onRefresh}
            >
              <Text className="font-semibold text-white">Retry</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0c1d33]">
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4a9eff"
            />
          }
        >
          {/* Header */}
          <View className="px-4 pb-4 pt-2">
            <Text className="text-2xl font-bold text-white">Weather</Text>
            <View className="mt-1 flex-row items-center justify-between">
              <Text className="text-xs text-[#6b8bb5]">
                {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
              </Text>
              {weather?.timestamp && (
                <Text className="text-xs text-[#6b8bb5]">
                  Updated {formatUpdatedTime(weather.timestamp)}
                </Text>
              )}
            </View>
          </View>

          {weather && (
            <>
              {/* Current Conditions */}
              <CurrentConditionsCard
                temperature={weather.current.temperature}
                weatherCode={currentWeatherCode}
                pressure={weather.current.pressure}
                visibility={weather.current.visibility}
              />

              {/* Wind */}
              <WindCard
                speed={weather.current.wind.speed}
                gust={weather.current.wind.gust}
                direction={weather.current.wind.direction}
              />

              {/* Waves */}
              <WaveCard
                height={weather.current.waves.height}
                period={weather.current.waves.period}
                direction={weather.current.waves.direction}
              />
            </>
          )}

          {/* Tides */}
          {tides && (
            <TideCard
              station={tides.station}
              predictions={tides.predictions}
            />
          )}

          {/* Hourly Forecast */}
          {hourlyData.length > 0 && (
            <View className="mb-6">
              <Text className="mb-3 px-4 text-sm font-semibold uppercase tracking-wider text-[#6b8bb5]">
                24-Hour Forecast
              </Text>
              <FlatList
                data={hourlyData}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                keyExtractor={(item) => item.time}
                renderItem={({ item }) => <HourlyForecastCard point={item} />}
              />
            </View>
          )}

          {/* Error banner (shown with stale data) */}
          {error && weather && (
            <View className="mx-4 mb-4 rounded-lg bg-red-500/20 p-3">
              <Text className="text-xs text-red-400">{error}</Text>
            </View>
          )}

          {/* Bottom padding */}
          <View className="h-8" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
