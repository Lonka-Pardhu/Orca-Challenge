import { Tabs } from "expo-router";
import { View } from "react-native";
import { Map, CloudSun, Route, Settings } from "lucide-react-native";

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const color = focused ? "#2dd1ab" : "#6b8bb5";
  const size = 22;

  const icons: Record<string, React.ReactNode> = {
    Map: <Map size={size} color={color} />,
    Weather: <CloudSun size={size} color={color} />,
    Routes: <Route size={size} color={color} />,
    Settings: <Settings size={size} color={color} />,
  };

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      {icons[name] ?? null}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0c1d33",
          borderTopColor: "#1a3a5c",
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#2dd1ab",
        tabBarInactiveTintColor: "#6b8bb5",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Map",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Map" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="weather"
        options={{
          title: "Weather",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Weather" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{
          title: "Routes",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Routes" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Settings" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
