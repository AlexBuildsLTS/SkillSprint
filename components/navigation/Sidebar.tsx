import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { LayoutGrid, Layers, User, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { clsx } from 'clsx';

const Sidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    { icon: LayoutGrid, label: 'HQ', path: '/' },
    { icon: Layers, label: 'Tracks', path: '/tracks' },
    { icon: User, label: 'Operative', path: '/profile' },
  ];

  return (
    <View className="w-72 bg-[#020617] h-full border-r border-slate-800/50 flex flex-col md:flex pt-8 pb-6 px-4">
      
      {/* PROFILE HEADER (Top Left) */}
      <View className="flex-row items-center gap-3 px-2 mb-10">
        <View className="items-center justify-center w-10 h-10 overflow-hidden border rounded-xl bg-indigo-500/20 border-indigo-500/50">
           {user?.profile?.avatar_url ? (
             <Image source={{ uri: user.profile.avatar_url }} className="w-full h-full" />
           ) : (
             <ShieldCheck size={20} color="#6366f1" />
           )}
        </View>
        <View>
          <Text className="text-sm font-bold text-white">
            {user?.profile?.username || 'Admin'}
          </Text>
          <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            Level {user?.stats?.level || 1} Operator
          </Text>
        </View>
      </View>

      {/* NAVIGATION ITEMS */}
      <View className="flex-1 gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path === '/' && pathname === '/index');
          return (
            <Pressable
              key={item.path}
              onPress={() => router.push(item.path as any)}
              className={clsx(
                "flex-row items-center gap-4 px-4 py-3.5 rounded-xl transition-all",
                isActive ? "bg-indigo-500/10 border border-indigo-500/20" : "hover:bg-slate-800/50 border border-transparent"
              )}
            >
              <item.icon size={18} color={isActive ? '#6366f1' : '#64748b'} />
              <Text className={clsx("font-bold text-sm tracking-wide", isActive ? "text-white" : "text-slate-500")}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* SYSTEM STATUS (Bottom) */}
      <View className="p-4 mt-auto border bg-slate-900/50 border-slate-800 rounded-2xl">
        <Text className="text-[9px] font-black text-slate-600 uppercase tracking-[2px] mb-2">
          System Status
        </Text>
        <View className="flex-row items-center gap-2">
          <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <Text className="text-emerald-500 text-[10px] font-bold tracking-wide">Deno Edge: Online</Text>
        </View>
      </View>
    </View>
  );
};

export default Sidebar;