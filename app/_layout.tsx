import '../global.css';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  LogBox,
  Platform,
  View,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * 📝 ARCHITECTURAL DECISION LOG:
 * 1. Safe Area Provider: Wrapped at root to ensure hooks like useSafeAreaInsets()
 * work across all nested screens (critical for the Support Chat fix).
 * 2. NavigationGuard: Separated from RootLayout to allow hooks (useAuth, useRouter)
 * to access the Context Provider.
 * 3. Sprint Security: Sprint screen has gestureEnabled: false to prevent database
 * inconsistency if a user mid-way through a task accidentally swipes back.
 * 4. Responsive Hook: useWindowDimensions is integrated at the root to allow
 * the app to re-render layouts instantly on web-browser resize.
 */

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
]);

// Prevent the splash screen from auto-hiding before auth hydration is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * 🏗️ ARCHITECTURAL CONSTANTS
 */
const BREAKPOINTS = {
  TABLET: 768,
  DESKTOP: 1024,
};

const THEME = {
  background: '#020617',
  accent: '#64FFDA', // Branding: SkillSprint Cyan/Emerald
  obsidian: '#0A192F',
};

const queryClient = new QueryClient();

/**
 * 🛰️ NAVIGATION ORCHESTRATOR
 * Handles the "Deno Wall" logic: Ensuring users are strictly routed
 * based on their Supabase Session state.
 */
function NavigationGuard() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Track navigation state to prevent infinite loops in the Expo Router tree
  const navigationState = useRef({ isReady: false, lastPath: '' });

  const isDesktop = useMemo(() => width >= BREAKPOINTS.TABLET, [width]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    // Logic Gate: Determine destination based on session presence
    if (!session && !inAuthGroup) {
      // Unauthenticated users are strictly forced to Login
      navigationState.current.lastPath = '/(auth)/login';
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Authenticated users are strictly forced into the application tabs
      navigationState.current.lastPath = '/(tabs)';
      router.replace('/(tabs)');
    }

    // Hide Splash only after the first valid routing decision is made
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
      navigationState.current.isReady = true;
    }, 100);

    return () => clearTimeout(timer);
  }, [session, loading, segments]);

  /**
   * 🎨 LOADING STATE UI
   * Rendered during initial Supabase session retrieval.
   */
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: THEME.obsidian,
        }}
      >
        <ActivityIndicator size="large" color={THEME.accent} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation:
          Platform.OS === 'ios' ? 'slide_from_right' : 'fade_from_bottom',
        gestureEnabled: true,
        contentStyle: { backgroundColor: THEME.background },
      }}
    >
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />

      {/* 🚀 SPRINT FLOW MODALS */}
      <Stack.Screen
        name="sprint-setup"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="sprint"
        options={{
          gestureEnabled: false, // Security: Prevent users from swiping back during active task execution
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}

/**
 * 👑 ROOT LAYOUT
 * The top-level provider wrapper. Includes Safe Area, Query Client,
 * Auth context, and Gesture Handling.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <StatusBar style="light" translucent />
            <NavigationGuard />
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * 📝 ARCHITECTURAL DECISION LOG:
 * 1. Safe Area Provider: Wrapped at root to ensure hooks like useSafeAreaInsets()
 * work across all nested screens (critical for the Support Chat fix).
 * 2. NavigationGuard: Separated from RootLayout to allow hooks (useAuth, useRouter)
 * to access the Context Provider.
 * 3. Sprint Security: Sprint screen has gestureEnabled: false to prevent database
 * inconsistency if a user mid-way through a task accidentally swipes back.
 * 4. Responsive Hook: useWindowDimensions is integrated at the root to allow
 * the app to re-render layouts instantly on web-browser resize.
 */
