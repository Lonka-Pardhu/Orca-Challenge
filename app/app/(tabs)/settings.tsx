import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Settings } from "lucide-react-native";

export default function SettingsScreen() {
  return (
    <View className="flex-1 bg-[#0c1d33]">
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-4">
            <Settings size={48} color="#6b8bb5" />
          </View>
          <Text className="mb-2 text-2xl font-bold text-white">Settings</Text>
          <Text className="mt-6 text-center text-sm text-[#6b8bb5]">
            SeaTrack v1.0.0
          </Text>
          <Text className="mt-2 text-center text-xs text-[#4a6a8a]">
            Marine & Boating App
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
