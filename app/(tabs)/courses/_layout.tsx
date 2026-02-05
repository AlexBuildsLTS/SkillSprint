import { Stack } from 'expo-router';
import React from 'react';

export default function CoursesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#020617' }, // Matches Obsidian Theme
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[language]" />
      <Stack.Screen name="guide/[id]" options={{ presentation: 'card' }} />
    </Stack>
  );
}
