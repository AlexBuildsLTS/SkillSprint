/**
 * ============================================================================
 * 🧭 SKILLSPRINT: ADAPTIVE NAVIGATION LAYOUT
 * ============================================================================
 * FEATURES:
 * - DESKTOP: Sidebar Navigation with Indigo Theme.
 * - MOBILE: Glassmorphic Bottom Tabs.
 * - LOGIC: Hides 'support' and 'settings' from visual nav but keeps them accessible.
 * ============================================================================
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Tabs, Slot, useRouter, usePathname } from 'expo-router';
import { Grid, Layers, User, Zap, LogOut } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const DESKTOP_WIDTH = 1024;

// THEME CONSTANTS
const THEME = {
  indigo: '#6366f1',
  slate: '#94a3b8',
  obsidian: '#020617',
  danger: '#EF4444',
  white: '#FFFFFF',
};

/**
 * Mobile Tab Bar Background (Glassmorphism)
 */
const TabBarBackground = () => {
  if (Platform.OS === 'ios') {
    return (
      <BlurView tint="dark" intensity={30} style={StyleSheet.absoluteFill} />
    );
  }
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: 'rgba(2, 6, 23, 0.95)' },
      ]}
    />
  );
};

const TabBarButton = React.forwardRef<
  View,
  React.ComponentProps<typeof Pressable>
>((props, ref) => (
  <Pressable
    {...props}
    ref={ref}
    onPress={(e) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (props.onPress) {
        props.onPress(e);
      }
    }}
  />
));
TabBarButton.displayName = 'TabBarButton';

export default function AdaptiveLayout() {
  const { signOut } = useAuth();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const router = useRouter();

  const isDesktop = width >= DESKTOP_WIDTH;

  // Navigation Nodes for Desktop Sidebar
  const navigationNodes = [
    { label: 'HQ', path: '/(tabs)/', icon: Grid },
    { label: 'Tracks', path: '/(tabs)/tracks', icon: Layers },
    { label: 'Operative', path: '/(tabs)/profile', icon: User },
    // Support is usually hidden on mobile tabs but can be shown on desktop sidebar if desired
    // For now, we'll keep it consistent and access it via Profile, but here is the logic if you wanted it:
    // { label: 'Support', path: '/(tabs)/support', icon: LifeBuoy },
  ];
  // --- DESKTOP LAYOUT (SIDEBAR) ---
  if (isDesktop) {
    return (
      <View style={styles.desktopRoot}>
        <View style={styles.sidebar}>
          <View>
            {/* Brand Header */}
            <View style={styles.brandBox}>
              <View style={styles.logoCircle}>
                <Zap size={22} color={THEME.obsidian} fill={THEME.obsidian} />
              </View>
              <Text style={styles.brandText}>SkillSprint</Text>
            </View>

            {/* Navigation Menu */}
            {navigationNodes.map((item) => {
              // Exact match for index, startsWith for others to handle sub-routes
              const active =
                item.path === '/(tabs)/'
                  ? pathname === '/' || pathname === '/index'
                  : pathname.startsWith(item.path);

              return (
                <TouchableOpacity
                  key={item.path}
                  onPress={() => router.push(item.path as any)}
                  style={[styles.sideItem, active && styles.sideItemActive]}
                >
                  <item.icon
                    size={20}
                    color={active ? THEME.indigo : '#475569'}
                  />
                  <Text
                    style={[styles.sideLabel, active && styles.sideLabelActive]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Logout Button */}
          <TouchableOpacity onPress={signOut} style={styles.sideLogout}>
            <LogOut size={20} color={THEME.danger} />
            <Text style={styles.logoutText}>TERMINATE SESSION</Text>
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
      </View>
    );
  }

  // --- MOBILE LAYOUT (BOTTOM TABS) ---
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Prevents double headers
        tabBarShowLabel: true,
        tabBarActiveTintColor: THEME.indigo,
        tabBarInactiveTintColor: THEME.slate,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          backgroundColor:
            Platform.OS === 'ios' ? 'transparent' : THEME.obsidian,
        },
        tabBarBackground: () => <TabBarBackground />,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginBottom: Platform.OS === 'ios' ? 0 : 10,
        },
        tabBarItemStyle: {
          width: 100,
          marginTop: Platform.OS === 'ios' ? 14 : 0,
        },
      }}
    >
      {/* 1. DASHBOARD */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'HQ',
          tabBarIcon: ({ color }) => <Grid size={24} color={color} />,
        }}
      />

      {/* 2. TRACKS */}
      <Tabs.Screen
        name="tracks"
        options={{
          title: 'Tracks',
          tabBarIcon: ({ color }) => <Layers size={24} color={color} />,
        }}
      />

      {/* 3. PROFILE */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Operative',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />

      {/* --- HIDDEN ROUTES (Accessible via Nav but Hidden from Bar) --- */}
      <Tabs.Screen name="support" options={{ href: null }} />

      {/* If you have a settings directory, hide it here too */}
      {/* <Tabs.Screen name="settings" options={{ href: null }} /> */}
    </Tabs>
  );
}

// --- STYLESHEET (Desktop Sidebar) ---
const styles = StyleSheet.create({
  desktopRoot: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: THEME.obsidian,
  },
  sidebar: {
    width: 280,
    backgroundColor: '#0A101F', // Slightly lighter than obsidian for contrast
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
    padding: 32,
    justifyContent: 'space-between',
  },
  brandBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 48 },
  logoCircle: {
    width: 40,
    height: 40,
    backgroundColor: THEME.indigo,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    marginLeft: 16,
    fontSize: 20,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 1,
    fontStyle: 'italic',
  },
  sideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  sideItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)', // Indigo with opacity
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  sideLabel: {
    marginLeft: 16,
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  sideLabelActive: { color: 'white' },
  sideLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  logoutText: {
    marginLeft: 16,
    fontWeight: '900',
    color: THEME.danger,
    fontSize: 12,
    letterSpacing: 1,
  },
});
