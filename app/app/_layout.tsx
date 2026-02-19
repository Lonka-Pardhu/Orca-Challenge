import { useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import { SplashScreen } from '../components/SplashScreen';

// Initialize Mapbox with access token
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

console.log('[Mapbox] Token exists:', !!MAPBOX_ACCESS_TOKEN);

if (MAPBOX_ACCESS_TOKEN) {
  Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
  console.log('[Mapbox] Access token set successfully');
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <SafeAreaProvider>
      <StatusBar style={showSplash ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
      {showSplash && (
        <SplashScreen onAnimationComplete={() => setShowSplash(false)} />
      )}
    </SafeAreaProvider>
  );
}
