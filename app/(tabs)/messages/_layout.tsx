import { useAuth } from '@/context/AuthContext';
import { Stack } from 'expo-router';

export default function MessagesLayout() {
  // This layout handles the nested stack for the messaging system
  // including the inbox and the individual chat sessions.

  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A101F' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[id]"
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          headerShown: false,
          contentStyle: { backgroundColor: '#0A101F' },
        }}
      />
    </Stack>
  );
}
