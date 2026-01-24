import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { Home, Layers, User, Settings, LogOut } from 'lucide-react-native';

export default function TabsLayout() {
  const { user, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // Header Component (Mobile/Desktop Shared)
  const Header = () => (
    <View className="h-16 border-b border-white/5 bg-[#020617] px-6 flex-row items-center justify-between">
      <Text className="text-xl italic font-black text-white">SkillSprint</Text>
      <View className="flex-row items-center space-x-4">
        <Text className="mr-2 text-xs font-bold text-slate-400">LVL {user?.stats?.level || 1}</Text>
        <TouchableOpacity className="items-center justify-center w-8 h-8 bg-indigo-500 rounded-full">
          <Text className="font-bold text-slate-950">{user?.profile?.username?.[0].toUpperCase()}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={signOut}><LogOut size={18} color="#ef4444" /></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#020617]">
      <Header />
      <View className="flex-row flex-1">
        {/* DESKTOP SIDEBAR */}
        {isDesktop && (
          <View className="w-64 p-6 space-y-4 border-r border-white/5">
             <SidebarItem icon={Home} label="Dashboard" active />
             <SidebarItem icon={Layers} label="Tracks" />
             <SidebarItem icon={User} label="Profile" />
          </View>
        )}
        
        <Tabs screenOptions={{ 
          headerShown: false,
          tabBarStyle: isDesktop ? { display: 'none' } : { backgroundColor: '#020617', borderTopColor: 'rgba(255,255,255,0.05)' }
        }}>
          <Tabs.Screen name="index" options={{ title: 'Sprint', tabBarIcon: ({ color }) => <Home color={color} /> }} />
          <Tabs.Screen name="tracks" options={{ title: 'Tracks', tabBarIcon: ({ color }) => <Layers color={color} /> }} />
          <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <User color={color} /> }} />
        </Tabs>
      </View>
    </View>
  );
}

const SidebarItem = ({ icon: Icon, label, active }: any) => (
  <TouchableOpacity className={`flex-row items-center p-4 rounded-2xl ${active ? 'bg-indigo-500/10' : ''}`}>
    <Icon size={20} color={active ? '#6366f1' : '#94a3b8'} />
    <Text className={`ml-4 font-bold ${active ? 'text-white' : 'text-slate-400'}`}>{label}</Text>
  </TouchableOpacity>
);