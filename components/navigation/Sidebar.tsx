import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Home, Zap, Layers, User } from 'lucide-react-native';
import { clsx } from 'clsx';

const Sidebar = () => {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Layers, label: 'Tracks', path: '/tracks' },
    { icon: Zap, label: 'Sprint', path: '/sprint' }, // Note: Sprint is usually modal, but keeping link here
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <View className="w-64 bg-surface h-full border-r border-gray-700 p-6 flex flex-col hidden md:flex">
      <View className="flex-row items-center gap-3 mb-10">
        <View className="w-8 h-8 bg-indigo-500 rounded-lg items-center justify-center">
          <Text className="text-white font-bold text-lg">S</Text>
        </View>
        <Text className="text-xl font-bold text-white">SkillSprint</Text>
      </View>

      <View className="flex-1 gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path === '/' && pathname === '/index');
          return (
            <Pressable
              key={item.path}
              onPress={() => router.push(item.path as any)}
              className={clsx(
                "flex-row items-center gap-3 px-4 py-3 rounded-xl transition-all",
                isActive ? "bg-indigo-500/20" : "hover:bg-gray-800"
              )}
            >
              <item.icon size={20} color={isActive ? '#6366f1' : '#9ca3af'} />
              <Text className={clsx("font-medium", isActive ? "text-primary" : "text-gray-400")}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-auto p-4 bg-gray-900/50 rounded-xl border border-gray-700">
        <Text className="text-xs text-gray-400 mb-2">Daily Goal</Text>
        <View className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
          <View className="bg-secondary w-3/4 h-full rounded-full" />
        </View>
        <Text className="text-right text-xs text-gray-400 mt-1">75%</Text>
      </View>
    </View>
  );
};

export default Sidebar;