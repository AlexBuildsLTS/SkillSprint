/**
 * ============================================================================
 * MODULE: ADMIN LAYOUT
 * ============================================================================
 * Controls access to the restricted administrative zone.
 * * SECURITY:
 * - Checks user role immediately upon mount.
 * - Redirects unauthorized users (non-ADMIN) back to the home tab.
 * - Enforces the Obsidian theme across all child routes.
 * * PATH: app/(tabs)/admin/_layout.tsx
 * ============================================================================
 */

import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function AdminLayout() {
  const { user, loading } = useAuth();

  // Show a loader while session is being verified to prevent premature redirects
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#020617',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  // STRICT ACCESS CONTROL
  // Only users with 'ADMIN' role in public.profiles can view these screens.
  const isAdmin = user?.profile?.role === 'ADMIN';

  if (!isAdmin) {
    // Silently redirect unauthorized users to the main dashboard
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#020617' }, // THEME.obsidian
        animation: 'fade', // Subtle transition for admin tools
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="users" />
    </Stack>
  );
}
