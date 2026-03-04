import { useAuth } from '@/context/AuthContext';
import { Stack, Redirect } from 'expo-router';

// Keep the exact same hex code as your individual screens
// to prevent color flashing during swipe animations.
const THEME = {
  obsidian: '#020617',
};

export default function MessagesLayout() {
  const { user } = useAuth();

  // 1. AAA+ UX: Gracefully redirect unauthorized users instead of rendering a dead blank screen.
  if (!user) {
    return <Redirect href="/" />; // Update href to match your actual login route
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // 2. AAA+ UI: Sync layout background with screen background
        contentStyle: { backgroundColor: THEME.obsidian },
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
          contentStyle: { backgroundColor: THEME.obsidian },
        }}
      />
    </Stack>
  );
}
