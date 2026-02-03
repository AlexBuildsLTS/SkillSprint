import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  StyleSheet,
  Image,
} from 'react-native';
import { Tabs, Slot, useRouter, usePathname } from 'expo-router';
import {
  Grid,
  Layers,
  LifeBuoy,
  LogOut,
  Settings,
  Bot,
  Framer,
  BrainCircuit,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { MainHeader } from '@/components/layout/MainHeader'; // Using your specific MainHeader

const DESKTOP_WIDTH = 1024;

const THEME = {
  indigo: '#6366f1',
  slate: '#94a3b8',
  obsidian: '#020617',
  danger: '#EF4444',
  white: '#FFFFFF',
  sidebarBg: '#0A101F',
  border: 'rgba(255,255,255,0.08)',
};

// --- MOBILE TAB BAR BACKGROUND ---
const TabBarBackground = () => {
  if (Platform.OS === 'ios') {
    return (
      <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />
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

export default function AdaptiveLayout() {
  const { signOut } = useAuth();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const router = useRouter();

  const isDesktop = width >= DESKTOP_WIDTH;

  // --- DESKTOP LAYOUT ---
  if (isDesktop) {
    const navItems = [
      { label: 'HOME', path: '/(tabs)/', icon: Grid },
      { label: 'TRACKS', path: '/(tabs)/tracks', icon: Framer },
      { label: 'AI', path: '/(tabs)/ai-chat', icon: BrainCircuit },
      { label: 'SUPPORT', path: '/(tabs)/support', icon: LifeBuoy },
      { label: 'SETTINGS', path: '/(tabs)/settings', icon: Settings },
    ];

    return (
      <View style={styles.desktopRoot}>
        {/* SIDEBAR */}
        <View style={styles.sidebar}>
          <View>
            <View style={styles.brandBox}>
              <Image
                source={require('@/assets/images/icon-sq.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            {navItems.map((item) => {
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
          <TouchableOpacity onPress={signOut} style={styles.sideLogout}>
            <LogOut size={20} color={THEME.danger} />
            <Text style={styles.logoutText}>TERMINATE SESSION</Text>
          </TouchableOpacity>
        </View>

        {/* MAIN CONTENT AREA */}
        <View style={{ flex: 1, backgroundColor: THEME.obsidian }}>
          {/* PERSISTENT HEADER (Z-Index 50 ensures dropdown is on top) */}
          <View style={{ zIndex: 50 }}>
            <MainHeader />
          </View>

          {/* PAGE CONTENT */}
          <View style={{ flex: 1, zIndex: 1 }}>
            <Slot />
          </View>
        </View>
      </View>
    );
  }

  // --- MOBILE LAYOUT ---
  return (
    <View style={{ flex: 1, backgroundColor: THEME.obsidian }}>
      {/* PERSISTENT HEADER (Fixed at top) */}
      <View style={{ zIndex: 50 }}>
        <MainHeader />
      </View>

      {/* TABS NAVIGATOR */}
      <View style={{ flex: 1, zIndex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false, // We use MainHeader above instead
            tabBarShowLabel: true,
            tabBarActiveTintColor: THEME.indigo,
            tabBarInactiveTintColor: THEME.slate,
            tabBarStyle: {
              position: 'absolute',
              borderTopWidth: 0,
              elevation: 0,
              height: Platform.OS === 'ios' ? 88 : 70,
              backgroundColor:
                Platform.OS === 'ios' ? 'transparent' : THEME.obsidian,
              paddingTop: 10,
            },
            tabBarBackground: () => <TabBarBackground />,
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: '700',
              fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
              marginBottom: Platform.OS === 'ios' ? 0 : 10,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ color }) => <Grid size={24} color={color} />,
            }}
          />
          <Tabs.Screen
            name="tracks"
            options={{
              title: 'Tracks',
              tabBarIcon: ({ color }) => <Framer size={24} color={color} />,
            }}
          />
          <Tabs.Screen
            name="ai-chat"
            options={{
              title: 'AI Coach',
              tabBarIcon: ({ color }) => <BrainCircuit size={24} color={color} />,
            }}
          />

          {/* HIDDEN ROUTES */}
          <Tabs.Screen name="settings" options={{ href: null }} />
          <Tabs.Screen name="settings/profile-view" options={{ href: null }} />
           <Tabs.Screen name="support" options={{ href: null }} />

          {/* ADMIN TAB: Completely Hidden from Mobile Tab Bar */}
          <Tabs.Screen
            name="admin"
            options={{
              tabBarButton: () => null,
              tabBarItemStyle: { display: 'none' },
            }}
          />
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopRoot: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: THEME.obsidian,
  },
  sidebar: {
    width: 260,
    backgroundColor: THEME.sidebarBg,
    borderRightWidth: 1,
    borderRightColor: THEME.border,
    paddingVertical: 32,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    zIndex: 60, // Sidebar stays above content
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 48,
    width: '100%',
  },
  logoImage: {
    width: 42,
    height: 42,
  },
  sideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  sideItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  sideLabel: {
    marginLeft: 14,
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sideLabelActive: {
    color: 'white',
  },
  sideLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  logoutText: {
    marginLeft: 14,
    fontWeight: '800',
    color: THEME.danger,
    fontSize: 11,
    letterSpacing: 1,
  },
});
