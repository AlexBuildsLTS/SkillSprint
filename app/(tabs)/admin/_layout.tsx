import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function AdminLayout() {
  const { user } = useAuth();
  
  // STRICT: Only ADMIN can access the Admin Dashboard
  // Moderators are restricted to the Support page tools only.
  const isAdmin = user?.profile?.role === 'ADMIN';

  if (!isAdmin) {
    return <Redirect href="/(tabs)/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#020617' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="users" />
    </Stack>
  );
}