import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

export default function AuthLayout() {
  // Extracted screen options for better readability and maintainability
  const screenOptions = {
    headerShown: false,
    contentStyle: { backgroundColor: '#0f172a' },
    animation: 'fade' as const,
    gestureEnabled: false,
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="login" options={{ title: 'Sign In' }} />
        <Stack.Screen name="register" options={{ title: 'Create Account' }} />
      </Stack>
    </View>
  );
}