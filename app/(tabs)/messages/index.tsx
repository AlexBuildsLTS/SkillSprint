/**
 * =============================================================
 * 💬 MESSAGES INBOX - PROFESSIONAL UI (NativeWind)
 * =============================================================
 * Architecture Notes:
 * - Realtime active conversations fetch.
 * - NativeWind + Reanimated animations.
 * - Pixel-perfect iMessage-inspired layout.
 * =============================================================
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Edit, X, User, Waypoints, ChevronRight, MessageSquareOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function MessagesInboxScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  useEffect(() => {
    if (user?.id) fetchConversations();
  }, [user?.id]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          updated_at,
          conversation_participants!inner(user_id, last_read_at, profiles(id, username, full_name, avatar_url, presence_status)),
          messages(content, created_at, sender_id)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((conv: any) => {
        const me = conv.conversation_participants.find((p: any) => p.user_id === user?.id);
        const other = conv.conversation_participants.find((p: any) => p.user_id !== user?.id)?.profiles;

        const sortedMessages = conv.messages?.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const lastMessage = sortedMessages?.[0];

        const hasUnread = lastMessage && me?.last_read_at 
          ? new Date(lastMessage.created_at) > new Date(me.last_read_at)
          : false;

        return {
          id: conv.id,
          otherUser: other,
          lastMessage,
          hasUnread,
          updatedAt: conv.updated_at
        };
      });

      setConversations(formatted);
    } catch (err) {
      console.error('Fetch conversations error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSearch = async (text: string) => {
    setUserSearchQuery(text);
    if (text.length < 2) {
      setSearchedUsers([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, presence_status')
        .neq('id', user?.id as string)
        .or(`username.ilike.%${text}%,full_name.ilike.%${text}%`)
        .limit(10);

      if (error) throw error;
      setSearchedUsers(data || []);
    } catch (err) {
      console.error('User search error:', err);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const startNewChat = async (targetUserId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsNewChatModalOpen(false);

    try {
      // Use RPC to ensure we don't create duplicate 1:1 chats
      const { data: conversationId, error } = await supabase.rpc('create_or_get_conversation' as any, {
        target_user_id: targetUserId
      });

      if (error) throw error;
      if (conversationId) router.push(`/messages/${conversationId}`);
    } catch (err) {
      console.error('Start chat error:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const renderConversationItem = ({ item, index }: { item: any, index: number }) => (
    <Animated.View entering={FadeInUp.delay(index * 50)}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/messages/${item.id}`);
        }}
        className="flex-row items-center px-6 py-4 border-b border-white/5 active:bg-white/5"
      >
        <View className="relative">
          {item.otherUser?.avatar_url ? (
            <Image source={{ uri: item.otherUser.avatar_url }} className="w-14 h-14 rounded-full border border-white/10" />
          ) : (
            <View className="w-14 h-14 rounded-full bg-indigo-500/10 items-center justify-center border border-indigo-500/30">
              <Text className="text-xl font-black text-indigo-400">{item.otherUser?.username?.[0]?.toUpperCase()}</Text>
            </View>
          )}
          <View className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[#020617] ${
            item.otherUser?.presence_status === 'ONLINE' ? 'bg-emerald-500' : 
            item.otherUser?.presence_status === 'BUSY' ? 'bg-amber-500' : 'bg-slate-600'
          }`} />
        </View>

        <View className="flex-1 ml-4 justify-center">
          <View className="flex-row justify-between items-center mb-1">
            <Text className={`text-base ${item.hasUnread ? 'text-white font-black' : 'text-slate-200 font-bold'}`}>
              {item.otherUser?.full_name || item.otherUser?.username}
            </Text>
            <Text className="text-[10px] text-slate-500 font-bold">
              {item.lastMessage ? new Date(item.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className={`text-sm flex-1 ${item.hasUnread ? 'text-indigo-400 font-bold' : 'text-slate-500'}`} numberOfLines={1}>
              {item.lastMessage?.content ? '🔒 Secure Message' : 'Start a secure tunnel...'}
            </Text>
            {item.hasUnread && <View className="w-2.5 h-2.5 rounded-full bg-indigo-500 ml-2 shadow-sm shadow-indigo-500" />}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#020617]" edges={['top']}>
      {/* HEADER */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center">
          <Waypoints size={32} color="#6366f1" />
          <Text className="text-2xl font-black text-white ml-3 tracking-tighter">Messages</Text>
        </View>
        
        <TouchableOpacity 
          onPress={() => setIsNewChatModalOpen(true)}
          className="w-10 h-10 rounded-full bg-indigo-600 items-center justify-center shadow-lg shadow-indigo-500/30"
        >
          <Edit size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View className="px-6 pb-4">
        <View className="flex-row items-center bg-white/5 rounded-2xl px-4 py-3 border border-white/10">
          <Search size={18} color="#475569" />
          <TextInput
            className="flex-1 ml-3 text-white text-base font-bold"
            placeholder="Search conversations..."
            placeholderTextColor="#475569"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* LIST */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366f1" />
        </View>
      ) : conversations.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="w-20 h-20 bg-white/5 rounded-full items-center justify-center mb-6 border border-white/10">
            <MessageSquareOff size={32} color="#475569" />
          </View>
          <Text className="text-white text-xl font-black mb-2">No transmissions</Text>
          <Text className="text-slate-500 text-center text-sm leading-5">Your secure communication line is empty. Start a new chat to begin encrypted tunneling.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations.filter(c => 
            c.otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.otherUser?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
          )}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* NEW CHAT MODAL */}
      <Modal visible={isNewChatModalOpen} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-[#020617]">
          <View className="flex-row items-center justify-between px-6 py-6 border-b border-white/5">
            <Text className="text-2xl font-black text-white">New Tunnel</Text>
            <TouchableOpacity onPress={() => setIsNewChatModalOpen(false)} className="p-2 bg-white/5 rounded-full">
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View className="p-6">
            <View className="flex-row items-center bg-white/5 rounded-2xl px-4 py-4 border border-white/10">
              <Search size={18} color="#475569" />
              <TextInput
                className="flex-1 ml-3 text-white text-base font-bold"
                placeholder="Search @username..."
                placeholderTextColor="#475569"
                value={userSearchQuery}
                onChangeText={handleUserSearch}
                autoFocus
              />
              {isSearchingUsers && <ActivityIndicator size="small" color="#6366f1" />}
            </View>
          </View>

          <FlatList
            data={searchedUsers}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => startNewChat(item.id)}
                className="flex-row items-center px-6 py-4 border-b border-white/5 active:bg-white/5"
              >
                <View>
                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} className="w-12 h-12 rounded-full border border-white/10" />
                  ) : (
                    <View className="w-12 h-12 rounded-full bg-indigo-500/10 items-center justify-center border border-indigo-500/30">
                      <User size={24} color="#818cf8" />
                    </View>
                  )}
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-white font-black text-base">{item.full_name || item.username}</Text>
                  <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest">@{item.username}</Text>
                </View>
                <ChevronRight size={20} color="#1e293b" />
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
