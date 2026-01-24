/**
 * =============================================================
 * ⚙️ SETTINGS LAYOUT
 * =============================================================
 * Nested stack navigation for settings pages
 * =============================================================
 */

import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#020617',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '900',
          fontSize: 18,
        },
        contentStyle: { backgroundColor: '#020617' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Settings',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="change-password"
        options={{
          title: 'Change Password',
          headerBackTitle: 'Settings',
        }}
      />
      <Stack.Screen
        name="biometric"
        options={{
          title: 'Biometric Security',
          headerBackTitle: 'Settings',
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: 'Edit Profile',
          headerBackTitle: 'Settings',
        }}
      />
      <Stack.Screen
        name="profile-view"
        options={{
          title: 'Profile',
          headerBackTitle: 'Back',
          headerShown: false, // Uses MainHeader instead
        }}
      />
    </Stack>
  );
}
