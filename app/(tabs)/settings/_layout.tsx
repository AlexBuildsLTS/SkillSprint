/**
 * ============================================================================
 * ⚙️ MODULE: SETTINGS LAYOUT
 * ============================================================================
 * Defines the navigation stack for the Settings tab.
 * * KEY CHANGE: We disable the native header (headerShown: false) for the
 * main index screen so your custom Cog icon header is the only one visible.
 * ============================================================================
 */

import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        // Default options for all screens in this stack
        headerStyle: {
          backgroundColor: '#020617', // Match Obsidian theme
        },
        headerTintColor: '#ffffff', // White back arrows/titles
        headerTitleStyle: {
          fontWeight: '900',
          fontSize: 16,
        },
        headerShadowVisible: false, // Removes default native border line
        contentStyle: { backgroundColor: '#020617' },
      }}
    >
      {/* 1. MAIN SETTINGS SCREEN 
        - headerShown: false -> Hides the "Settings" text & white line.
        - Allows app/(tabs)/settings/index.tsx to control
      */}
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />

      {/* 2. SUB-SCREENS (Keep headers for navigation back) */}
      <Stack.Screen
        name="change-password"
        options={{
          title: 'SECURITY',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="biometric"
        options={{
          title: 'BIOMETRICS',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: 'EDIT DETAILS',
          headerBackTitle: 'Back',
        }}
      />

      {/* 3. PROFILE VIEW (Custom Header handling inside component) */}
      <Stack.Screen
        name="profile-view"
        options={{
          headerShown: false,
          presentation: 'card', // Standard push animation
        }}
      />
    </Stack>
  );
}
