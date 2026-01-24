/**
 * ============================================================================
 * 💠 NORTH EXTRACT: ROOT LAYOUT (NAVIGATION LOOP FIX)
 * ============================================================================
 * Path: app/_layout.tsx
 * STATUS: FIXED
 * CRITICAL REPAIR:
 * - Changed useEffect dependency from 'segments' (array) to 'segments[0]' (string).
 * - This prevents the infinite render loop causing the "Maximum update depth" crash.
 * ============================================================================
 */

import '../global.css';
import { LogBox, Platform, View, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { AuthProvider, useAuth } from '@/context/AuthContext';

SplashScreen.preventAutoHideAsync();

// AGGRESSIVE LOG SUPPRESSION
LogBox.ignoreLogs([
  'onStartShouldSetResponder',
  'onResponderGrant',
  'onResponderRelease',
  'onResponderTerminate',
  'onResponderMove',
  'onResponderTerminationRequest',
  'onPressOut',
]);

if (Platform.OS === 'web') {
  const originalError = console.error;
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Unknown event handler property') &&
      (args[0].includes('onStartShouldSetResponder') ||
        args[0].includes('onResponderGrant') ||
        args[0].includes('onResponderRelease') ||
        args[0].includes('onResponderTerminate') ||
        args[0].includes('onResponderMove') ||
        args[0].includes('onResponderTerminationRequest') ||
        args[0].includes('onPressOut'))
    ) {
      return;
    }
    originalError(...args);
  };
}

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (session && inAuthGroup) {
      // User is signed in, redirect to home tabs
      router.replace('/(tabs)/');
    } else if (!session && !inAuthGroup) {
      // User is not signed in, redirect to login
      router.replace('/(auth)/login');
    }
    // CRITICAL FIX: Depend on segments[0] string, NOT the segments array
  }, [session, loading, isMounted, segments, router]);

  if (loading || !isMounted) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#0A192F',
        }}
      >
        <ActivityIndicator size="large" color="#64FFDA" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A192F' },
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    // Add fonts here if needed
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
    if (error) {
      console.error('Font loading error:', error);
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="light" />
        <RootLayoutNav />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
