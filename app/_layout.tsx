import '../global.css';
import { LogBox, Platform, View, ActivityIndicator } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { session, loading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const lastNavPath = useRef<string>('');

  useEffect(() => {
    // 1. Never nav while auth is initializing
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const targetPath = session ? '/(tabs)' : '/(auth)/login';

    // 2. Prevent redundant navigation calls (Fixes Chromium "Unreachable Code" error)
    if (lastNavPath.current === targetPath) return;

    if (session && inAuthGroup) {
      lastNavPath.current = '/(tabs)';
      router.replace('/(tabs)');
      SplashScreen.hideAsync().catch(() => {});
    } else if (!session && !inAuthGroup) {
      lastNavPath.current = '/(auth)/login';
      router.replace('/(auth)/login');
      SplashScreen.hideAsync().catch(() => {});
    } else if (session || !inAuthGroup) {
      // App is ready
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [session, loading, segments, router]);

  if (loading) {
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
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <StatusBar style="light" />
          <RootLayoutNav />
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
