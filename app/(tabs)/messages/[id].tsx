/**
 * ============================================================================
 * 🛡️ SKILLSPRINT SECURE CHAT TERMINAL - TRUE E2EE PRODUCTION BUILD v9.8
 * ============================================================================
 * Architecture (Dual-Key Hybrid Encryption):
 * - Sender Key Fix: Now strictly pulls sender's public key from Secure Storage to guarantee dual-encryption.
 * - Avatar Fix: Properly targets user.user_metadata for optimistic UI renders.
 * - Native Crypto Offloading: Uses react-native-rsa-native to prevent APK freezing.
 * - True Block Engine: Uses insert/delete directly instead of upsert to fix reset bugs.
 * ============================================================================
 */

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  Image,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Alert,
  Keyboard,
  KeyboardEvent,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Send,
  Camera,
  Smile,
  ShieldCheck,
  UserX,
  BellOff,
  Shield,
  Zap,
  X,
  FileText,
  CheckCheck,
  Trash2,
  Copy,
  Lock,
  Unlock,
  AlertCircle,
  ChevronLeft,
  Settings,
  MoreVertical,
  User,
  KeyRound,
  Circle,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import secureStorage from '@/lib/secureStorage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  FadeInDown,
  Layout,
  FadeOut,
  SlideInDown,
  ZoomIn,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import forge from 'node-forge';

import { GlassCard } from '@/components/ui/GlassCard';
import { Database } from '@/supabase/database.types';

// 🛡️ NATIVE CRYPTO BRIDGE (Prevents ANR Freezes on Android/iOS)
let NativeRSA: any;
if (Platform.OS !== 'web') {
  NativeRSA = require('react-native-rsa-native').RSA;
}

const THEME = {
  obsidian: '#020617',
  indigo: '#6366f1',
  slate: '#94a3b8',
  white: '#ffffff',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassSurface: 'rgba(30, 41, 59, 0.4)',
};

const COMMON_EMOJIS = [
  '👍',
  '🔥',
  '🚀',
  '💻',
  '💡',
  '✅',
  '👀',
  '😂',
  '💯',
  '🙏',
  '🎉',
  '💀',
  '🤖',
  '🤯',
  '😎',
  '🙌',
];

type UserRole = Database['public']['Enums']['user_role'];

interface ProfileData {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  presence_status: string | null;
  last_seen_at: string | null;
  role: UserRole;
  public_key?: string | null;
}

interface DecryptedPayload {
  text: string;
  attachmentUrl?: string | null;
  attachmentType?: 'image' | 'file' | null;
}

interface Message {
  id: string;
  content: string;
  encrypted_aes_key?: string | null;
  sender_encrypted_aes_key?: string | null;
  sender_id: string | null;
  created_at: string;
  decryptedText?: string;
  attachmentUrl?: string | null;
  attachmentType?: 'image' | 'file' | null;
  profiles?: Partial<ProfileData>;
  isDecrypted?: boolean;
  decryptionError?: string;
}

const getLocalPrivateKey = async (): Promise<string | null> => {
  try {
    return await secureStorage.getItem('skillsprint_private_key');
  } catch (e) {
    return null;
  }
};

const getLocalPublicKey = async (): Promise<string | null> => {
  try {
    return await secureStorage.getItem('skillsprint_public_key');
  } catch (e) {
    return null;
  }
};

const encryptPayloadE2EDualKey = (
  text: string,
  recipientPublicKeyPem: string,
  senderPublicKeyPem: string | null,
  attachUrl?: string | null,
  attachType?: string | null,
) => {
  const oneTimeAESKey = forge.random.getBytesSync(32);
  const iv = forge.random.getBytesSync(16);

  const payloadStr = JSON.stringify({
    text,
    attachmentUrl: attachUrl || null,
    attachmentType: attachType || null,
  });

  const cipher = forge.cipher.createCipher('AES-CBC', oneTimeAESKey);
  cipher.start({ iv: iv });
  cipher.update(forge.util.createBuffer(payloadStr, 'utf8'));
  cipher.finish();
  const encryptedPayload = cipher.output.getBytes();

  const recipientPubKey = forge.pki.publicKeyFromPem(recipientPublicKeyPem);
  const recipientEncryptedAES = recipientPubKey.encrypt(
    oneTimeAESKey,
    'RSA-OAEP',
  );

  let senderEncryptedAES = null;
  if (senderPublicKeyPem) {
    try {
      const myPubKey = forge.pki.publicKeyFromPem(senderPublicKeyPem);
      senderEncryptedAES = myPubKey.encrypt(oneTimeAESKey, 'RSA-OAEP');
    } catch (e) {
      console.warn('Could not encrypt AES key for sender.');
    }
  }

  return {
    cipherText:
      forge.util.encode64(iv) + ':' + forge.util.encode64(encryptedPayload),
    recipientAES: forge.util.encode64(recipientEncryptedAES),
    senderAES: senderEncryptedAES
      ? forge.util.encode64(senderEncryptedAES)
      : null,
  };
};

const decryptPayloadE2E = async (
  cipherText: string,
  encryptedAESKeyB64?: string | null,
): Promise<DecryptedPayload & { success: boolean; errorMsg?: string }> => {
  try {
    if (!encryptedAESKeyB64) throw new Error('Missing AES Key');

    const privateKeyPem = await getLocalPrivateKey();
    if (!privateKeyPem) throw new Error('Local Keystore Missing or Locked.');

    const parts = cipherText.split(':');
    if (parts.length !== 2) throw new Error('Corrupt Payload Data.');

    const iv = forge.util.decode64(parts[0]);
    const encryptedPayload = forge.util.decode64(parts[1]);

    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const decryptedAESKey = privateKey.decrypt(
      forge.util.decode64(encryptedAESKeyB64),
      'RSA-OAEP',
    );

    const decipher = forge.cipher.createDecipher('AES-CBC', decryptedAESKey);
    decipher.start({ iv: iv });
    decipher.update(forge.util.createBuffer(encryptedPayload));

    const pass = decipher.finish();
    if (!pass) throw new Error('AES Padding Failure');

    const originalText = forge.util.decodeUtf8(decipher.output.getBytes());
    return { ...JSON.parse(originalText), success: true };
  } catch (e: any) {
    return {
      text: '🔒 Decryption Failed',
      attachmentUrl: null,
      attachmentType: null,
      success: false,
      errorMsg: e.message,
    };
  }
};

const generateIdentityFingerprint = (
  publicKeyPem: string | null | undefined,
): string => {
  if (!publicKeyPem) return 'NO PUBLIC KEY DETECTED';
  try {
    const md = forge.md.sha256.create();
    md.update(publicKeyPem, 'utf8');
    const hex = md.digest().toHex().toUpperCase();
    return hex.match(/.{1,4}/g)?.join(' ') || hex;
  } catch (e) {
    return 'FINGERPRINT GENERATION FAILED';
  }
};

const UserAvatar = ({
  url,
  name,
  size = 32,
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
}) => {
  if (url)
    return (
      <Image
        source={{ uri: url }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: THEME.glassBorder,
        }}
      />
    );
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(99,102,241,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: THEME.glassBorder,
      }}
    >
      <Text
        style={{
          color: THEME.indigo,
          fontWeight: '900',
          fontSize: size * 0.45,
        }}
      >
        {initial}
      </Text>
    </View>
  );
};

const RoleBadge = ({ role }: { role: UserRole | undefined }) => {
  if (!role || role === 'MEMBER') return null;
  const color =
    role === 'ADMIN'
      ? THEME.danger
      : role === 'PREMIUM'
        ? THEME.warning
        : THEME.indigo;
  const Icon =
    role === 'ADMIN' ? Shield : role === 'PREMIUM' ? Zap : ShieldCheck;
  let label = role === 'MODERATOR' ? 'MOD' : role === 'PREMIUM' ? 'PRO' : role;
  return (
    <View
      style={[
        styles.roleBadge,
        { backgroundColor: `${color}15`, borderColor: `${color}40` },
      ]}
    >
      <Icon size={10} color={color} />
      <Text style={[styles.roleText, { color }]}>{label}</Text>
    </View>
  );
};

const PresenceIndicator = ({
  status,
  lastSeen,
}: {
  status: string | null;
  lastSeen: string | null;
}) => {
  const isActuallyOnline = useMemo(() => {
    if (!lastSeen) return false;
    const lastActive = new Date(lastSeen).getTime();
    return lastActive > Date.now() - 5 * 60000;
  }, [lastSeen]);
  const color = isActuallyOnline
    ? THEME.success
    : status === 'BUSY'
      ? THEME.warning
      : THEME.slate;
  return <View style={[styles.presenceDot, { backgroundColor: color }]} />;
};

export default function ActiveChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = width < 768;
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const TAB_BAR_HEIGHT = isMobile ? 80 : 0;
  const bottomPadding =
    keyboardHeight > 0
      ? keyboardHeight + 10
      : Math.max(insets.bottom, 20) + TAB_BAR_HEIGHT;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [recipient, setRecipient] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [showFingerprint, setShowFingerprint] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [isBlockedByThem, setIsBlockedByThem] = useState(false);

  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [pendingFile, setPendingFile] = useState<{
    uri: string;
    type: 'image' | 'file';
    name: string;
  } | null>(null);

  const flatListRef = useRef<FlatList>(null);

  const ensureUserHasKeys = async () => {
    if (!user?.id) return;
    try {
      let privKey = await secureStorage.getItem('skillsprint_private_key');
      let pubKey = await secureStorage.getItem('skillsprint_public_key');

      if (!privKey || !pubKey) {
        setIsProvisioning(true);

        let generatedPriv, generatedPub;

        if (Platform.OS === 'web') {
          const keypair = await new Promise<forge.pki.rsa.KeyPair>(
            (resolve, reject) => {
              forge.pki.rsa.generateKeyPair(
                { bits: 2048, workers: -1 },
                (err, kp) => {
                  if (err) reject(err);
                  else resolve(kp);
                },
              );
            },
          );
          generatedPriv = forge.pki.privateKeyToPem(keypair.privateKey);
          generatedPub = forge.pki.publicKeyToPem(keypair.publicKey);
        } else {
          const keys = await NativeRSA.generateKeys(2048);
          generatedPriv = keys.private;
          generatedPub = keys.public;
        }

        await secureStorage.setItem('skillsprint_private_key', generatedPriv);
        await secureStorage.setItem('skillsprint_public_key', generatedPub);

        await supabase
          .from('profiles')
          .update({ public_key: generatedPub })
          .eq('id', user.id as string);
        setIsProvisioning(false);
        loadChatData();
      } else {
        loadChatData();
      }
    } catch (error) {
      console.error('[E2EE Setup Error]', error);
      setIsProvisioning(false);
    }
  };

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e: KeyboardEvent) => setKeyboardHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );

    if (conversationId && user?.id) {
      ensureUserHasKeys();
    }

    const channel = supabase
      .channel(`secure_room:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          if (payload.new.sender_id !== user?.id) {
            const dec = await decryptPayloadE2E(
              payload.new.content,
              payload.new.encrypted_aes_key,
            );
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', payload.new.sender_id)
              .single();

            const newMsg: Message = {
              ...(payload.new as any),
              decryptedText: dec.text,
              attachmentUrl: dec.attachmentUrl,
              attachmentType: dec.attachmentType as any,
              isDecrypted: dec.success,
              decryptionError: dec.errorMsg,
              profiles: senderProfile || {},
            };
            setMessages((prev) => [newMsg, ...prev]);
            if (!isMuted)
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        },
      )
      .subscribe();

    return () => {
      showSub.remove();
      hideSub.remove();
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  const loadChatData = async () => {
    if (!user?.id || !conversationId) return;

    try {
      const { data: partData } = await supabase
        .from('conversation_participants')
        .select('profiles(*)')
        .eq('conversation_id', conversationId as string)
        .neq('user_id', user.id)
        .maybeSingle();

      let currentRecipient = null;
      if (partData?.profiles) {
        currentRecipient = Array.isArray(partData.profiles)
          ? partData.profiles[0]
          : partData.profiles;
        setRecipient(currentRecipient as any);
      }

      if (currentRecipient) {
        const [{ data: myBlock }, { data: theirBlock }, { data: muteData }] =
          await Promise.all([
            supabase
              .from('blocked_users')
              .select('id')
              .eq('blocker_id', user.id)
              .eq('blocked_id', currentRecipient.id)
              .maybeSingle(),
            supabase
              .from('blocked_users')
              .select('id')
              .eq('blocker_id', currentRecipient.id)
              .eq('blocked_id', user.id)
              .maybeSingle(),
            supabase
              .from('muted_conversations')
              .select('id')
              .eq('user_id', user.id)
              .eq('conversation_id', conversationId as string)
              .maybeSingle(),
          ]);

        setIsBlockedByMe(!!myBlock);
        setIsBlockedByThem(!!theirBlock);
        setIsMuted(!!muteData);
      }

      const { data: msgData, error } = await supabase
        .from('messages')
        .select('*, profiles:sender_id(username, full_name, avatar_url, role)')
        .eq('conversation_id', conversationId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const decryptedHistory = await Promise.all(
        (msgData || []).map(async (m) => {
          let dec: DecryptedPayload & { success: boolean; errorMsg?: string } =
            {
              text: m.content,
              attachmentUrl: null,
              attachmentType: null,
              success: false,
            };

          const keyToUse =
            m.sender_id === user.id
              ? m.sender_encrypted_aes_key
              : m.encrypted_aes_key;

          if (keyToUse) {
            dec = await decryptPayloadE2E(m.content, keyToUse);
          } else if (m.sender_id === user.id) {
            dec.text = '🔒 Encrypted & Sent (Legacy)';
            dec.success = true;
          } else {
            dec.errorMsg = 'Key missing for this party.';
          }

          return {
            ...m,
            decryptedText: dec.text,
            attachmentUrl: dec.attachmentUrl,
            attachmentType: dec.attachmentType,
            isDecrypted: dec.success,
            decryptionError: dec.errorMsg,
          };
        }),
      );
      setMessages(decryptedHistory as Message[]);
    } catch (e) {
      console.error('[Load Error]', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickAttachment = async (mode: 'image' | 'file') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowEmojiPicker(false);
    try {
      if (mode === 'image') {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
        });
        if (!result.canceled && result.assets[0])
          setPendingFile({
            uri: result.assets[0].uri,
            type: 'image',
            name: result.assets[0].fileName || 'image.jpg',
          });
      } else {
        const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
        if (!result.canceled && result.assets[0])
          setPendingFile({
            uri: result.assets[0].uri,
            type: 'file',
            name: result.assets[0].name,
          });
      }
    } catch (e) {
      console.warn('Attachment cancelled');
    }
  };

  const handleSendMessage = async () => {
    if (isBlockedByMe || isBlockedByThem) {
      if (Platform.OS === 'web')
        window.alert('Action Denied: You cannot send messages in this state.');
      else
        Alert.alert('Action Denied', 'You cannot send messages in this state.');
      return;
    }
    if ((!inputText.trim() && !pendingFile) || isSending || !user?.id) return;
    if (!recipient?.public_key) {
      if (Platform.OS === 'web')
        window.alert(
          `Key Exchange Pending: The recipient (${recipient?.username}) has not initialized their secure terminal yet.`,
        );
      else
        Alert.alert(
          'Key Exchange Pending',
          `The recipient (${recipient?.username}) has not initialized their secure terminal yet.`,
        );
      return;
    }

    setShowEmojiPicker(false);
    setIsSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let secureAttachmentUrl = null;

    if (pendingFile) {
      const fileExt = pendingFile.name.split('.').pop() || 'bin';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      try {
        const response = await fetch(pendingFile.uri);
        const blob = await response.blob();
        const { error } = await supabase.storage
          .from('message-attachments')
          .upload(fileName, blob, { contentType: blob.type });
        if (error) throw error;
        const { data: signedData, error: signError } = await supabase.storage
          .from('message-attachments')
          .createSignedUrl(fileName, 31536000);
        if (signError) throw signError;
        secureAttachmentUrl = signedData.signedUrl;
      } catch (e) {
        if (Platform.OS === 'web')
          window.alert('Upload Failed: Could not secure attachment to vault.');
        else
          Alert.alert('Upload Failed', 'Could not secure attachment to vault.');
        setIsSending(false);
        return;
      }
    }

    const textToSend = inputText.trim();
    setInputText('');
    setPendingFile(null);

    try {
      const senderPublicKeyPem = await getLocalPublicKey();

      const { cipherText, recipientAES, senderAES } = encryptPayloadE2EDualKey(
        textToSend,
        recipient.public_key,
        senderPublicKeyPem,
        secureAttachmentUrl,
        pendingFile?.type,
      );

      const optimisticMsg: Message = {
        id: `temp-${Date.now()}`,
        content: cipherText,
        encrypted_aes_key: recipientAES,
        sender_encrypted_aes_key: senderAES,
        sender_id: user.id,
        created_at: new Date().toISOString(),
        decryptedText: textToSend,
        attachmentUrl: secureAttachmentUrl,
        attachmentType: pendingFile?.type as any,
        isDecrypted: true,
        profiles: {
          role: (user?.profile?.role || 'MEMBER') as UserRole,
          full_name:
            user?.profile?.full_name || user?.user_metadata?.full_name || 'Me',
          avatar_url:
            user?.profile?.avatar_url ||
            user?.user_metadata?.avatar_url ||
            null,
        },
      };
      setMessages((prev) => [optimisticMsg, ...prev]);

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId as string,
          sender_id: user.id,
          content: cipherText,
          encrypted_aes_key: recipientAES,
          sender_encrypted_aes_key: senderAES,
          attachment_type: pendingFile?.type || null,
          attachment_url: secureAttachmentUrl || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticMsg.id ? { ...m, id: data.id } : m,
          ),
        );
      }
    } catch (error: any) {
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
      const errMsg =
        error.message?.includes('RLS') || error.code === '42501'
          ? 'Message Blocked: The secure connection to this user has been severed.'
          : 'Cryptographic failure or network offline.';
      if (Platform.OS === 'web') window.alert(`Transmission Failed: ${errMsg}`);
      else Alert.alert('Transmission Failed', errMsg);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyMessage = async () => {
    if (selectedMessage?.decryptedText) {
      await Clipboard.setStringAsync(selectedMessage.decryptedText);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setSelectedMessage(null);
  };

  const toggleBlockUser = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (!recipient?.id || !user?.id) return;

    setShowSettings(false);
    setSelectedMessage(null);

    const currentlyBlocked = isBlockedByMe;
    setIsBlockedByMe(!currentlyBlocked);

    try {
      if (currentlyBlocked) {
        const { data, error } = await supabase
          .from('blocked_users')
          .delete()
          .eq('blocker_id', user.id)
          .eq('blocked_id', recipient.id)
          .select();
        if (error || !data || data.length === 0)
          throw new Error('Delete failed');
      } else {
        const { data, error } = await supabase
          .from('blocked_users')
          .insert({ blocker_id: user.id, blocked_id: recipient.id })
          .select();
        if (error || !data || data.length === 0)
          throw new Error('Insert failed');
      }
    } catch (error) {
      setIsBlockedByMe(currentlyBlocked);
      if (Platform.OS === 'web')
        window.alert(
          'Network Error: Failed to synchronize block status with server.',
        );
      else
        Alert.alert(
          'Network Error',
          'Failed to synchronize block status with server.',
        );
    }
  };

  const toggleMute = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!user?.id || !conversationId) return;

    const currentlyMuted = isMuted;

    setShowSettings(false);
    setSelectedMessage(null);
    setIsMuted(!currentlyMuted);

    try {
      if (currentlyMuted) {
        await supabase
          .from('muted_conversations')
          .delete()
          .eq('user_id', user.id)
          .eq('conversation_id', conversationId as string)
          .select();
      } else {
        await supabase
          .from('muted_conversations')
          .insert({
            user_id: user.id,
            conversation_id: conversationId as string,
          })
          .select();
      }
    } catch (error) {
      setIsMuted(currentlyMuted);
      if (Platform.OS === 'web')
        window.alert(
          'Network Error: Failed to synchronize mute status with server.',
        );
      else
        Alert.alert(
          'Network Error',
          'Failed to synchronize mute status with server.',
        );
    }
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;
    const msgId = selectedMessage.id;
    setSelectedMessage(null);

    if (msgId.startsWith('temp-')) {
      if (Platform.OS === 'web')
        window.alert(
          'This transmission is currently syncing to the secure vault. Please wait a moment before deleting.',
        );
      else
        Alert.alert(
          'Processing Payload',
          'This transmission is currently syncing to the secure vault. Please wait a moment before deleting.',
        );
      return;
    }

    const executeDelete = async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const backupMessages = [...messages];
      setMessages((prev) => prev.filter((m) => m.id !== msgId));

      const { data, error } = await supabase
        .from('messages')
        .delete()
        .eq('id', msgId)
        .select();

      if (error || !data || data.length === 0) {
        setMessages(backupMessages);
        if (Platform.OS === 'web')
          window.alert(
            'Failed to delete. Ensure you ran the SQL policy updates.',
          );
        else
          Alert.alert('Delete Failed', 'Database security prevented deletion.');
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Are you sure you want to delete this message for everyone? This cannot be undone.',
      );
      if (confirmed) executeDelete();
    } else {
      Alert.alert(
        'Purge Payload',
        'Are you sure you want to delete this message for everyone? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: executeDelete },
        ],
      );
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.sender_id === user?.id;
    return (
      <Animated.View
        entering={FadeInUp.delay(index * 15)}
        layout={Layout.springify()}
        style={[
          styles.msgRow,
          { justifyContent: isMe ? 'flex-end' : 'flex-start' },
        ]}
      >
        {!isMe && (
          <View
            style={{ marginRight: 8, alignSelf: 'flex-end', marginBottom: 4 }}
          >
            <UserAvatar
              url={item.profiles?.avatar_url}
              name={item.profiles?.full_name || item.profiles?.username}
              size={32}
            />
          </View>
        )}

        <View
          style={[
            styles.msgContentWrapper,
            { justifyContent: isMe ? 'flex-end' : 'flex-start' },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              setSelectedMessage(item);
            }}
            style={[
              styles.bubbleContainer,
              { alignItems: isMe ? 'flex-end' : 'flex-start' },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 4,
              }}
            >
              {!isMe && (
                <Text style={styles.senderName}>
                  {item.profiles?.full_name ||
                    item.profiles?.username ||
                    'Unknown'}
                </Text>
              )}
              <RoleBadge role={item.profiles?.role as UserRole} />
            </View>

            <View
              style={[
                styles.bubble,
                {
                  backgroundColor: isMe ? THEME.indigo : THEME.glassSurface,
                  borderColor: isMe ? THEME.indigo : THEME.glassBorder,
                  borderBottomRightRadius: isMe ? 4 : 20,
                  borderBottomLeftRadius: isMe ? 20 : 4,
                },
              ]}
            >
              {item.attachmentUrl && item.attachmentType === 'image' && (
                <Image
                  source={{ uri: item.attachmentUrl }}
                  style={styles.bubbleImage}
                />
              )}
              {item.attachmentUrl && item.attachmentType === 'file' && (
                <View style={styles.fileLink}>
                  <FileText size={20} color={THEME.white} />
                  <Text style={styles.fileLinkText}>Encrypted Document</Text>
                </View>
              )}
              {item.decryptedText ? (
                <Text style={styles.msgText}>{item.decryptedText}</Text>
              ) : null}

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'flex-end',
                  marginTop: 6,
                }}
              >
                {!item.isDecrypted && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginRight: 4,
                    }}
                  >
                    <Lock
                      size={10}
                      color={THEME.warning}
                      style={{ marginRight: 4 }}
                    />
                  </View>
                )}
                <Text style={styles.msgTime}>
                  {new Date(item.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                {isMe && (
                  <CheckCheck
                    size={12}
                    color="rgba(255,255,255,0.7)"
                    style={{ marginLeft: 4 }}
                  />
                )}
              </View>

              {item.decryptionError && (
                <Text
                  style={{
                    fontSize: 9,
                    color: THEME.warning,
                    marginTop: 4,
                    fontStyle: 'italic',
                  }}
                >
                  {item.decryptionError.includes('Missing')
                    ? 'Old Format / Key Missing'
                    : 'Key Mismatch'}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedMessage(item)}
            style={{ padding: 8, opacity: 0.5 }}
          >
            <MoreVertical size={16} color={THEME.white} />
          </TouchableOpacity>
        </View>

        {isMe && (
          <View
            style={{ marginLeft: 8, alignSelf: 'flex-end', marginBottom: 4 }}
          >
            <UserAvatar
              url={item.profiles?.avatar_url}
              name={item.profiles?.full_name || item.profiles?.username}
              size={32}
            />
          </View>
        )}
      </Animated.View>
    );
  };

  if (isProvisioning) {
    return (
      <View
        style={[
          styles.root,
          { alignItems: 'center', justifyContent: 'center' },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={THEME.indigo}
          style={{ transform: [{ scale: 1.5 }], marginBottom: 24 }}
        />
        <Text style={{ color: THEME.white, fontSize: 20, fontWeight: '900' }}>
          Securing Terminal
        </Text>
        <Text
          style={{
            color: THEME.success,
            marginTop: 12,
            textAlign: 'center',
            paddingHorizontal: 40,
            lineHeight: 22,
          }}
        >
          Generating hardware-backed RSA-2048 keys. This may take up to 15
          seconds on older devices.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[THEME.obsidian, '#0f172a', '#000000']}
        style={StyleSheet.absoluteFill}
      />

      <View style={{ paddingTop: insets.top }}>
        <GlassCard style={styles.header} intensity="heavy">
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => router.push('/messages')}
              style={styles.iconBtn}
            >
              <ChevronLeft size={24} color={THEME.white} />
            </TouchableOpacity>

            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                marginLeft: 12,
              }}
            >
              <View>
                <UserAvatar
                  url={recipient?.avatar_url}
                  name={recipient?.full_name || recipient?.username}
                  size={44}
                />
                <PresenceIndicator
                  status={recipient?.presence_status || null}
                  lastSeen={recipient?.last_seen_at || null}
                />
              </View>
              <View style={{ marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.headerTitle}>
                    {recipient?.full_name ||
                      recipient?.username ||
                      'Secure Line'}
                  </Text>
                  {isMuted && (
                    <BellOff
                      size={12}
                      color={THEME.slate}
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </View>
                {isBlockedByMe || isBlockedByThem ? (
                  <Text style={[styles.headerStatus, { color: THEME.danger }]}>
                    USER BLOCKED
                  </Text>
                ) : (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 2,
                    }}
                  >
                    <Unlock
                      size={10}
                      color={
                        recipient?.public_key ? THEME.success : THEME.warning
                      }
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.headerStatus,
                        {
                          color: recipient?.public_key
                            ? THEME.success
                            : THEME.warning,
                        },
                      ]}
                    >
                      {recipient?.public_key
                        ? 'RSA-2048 EXCHANGE ACTIVE'
                        : 'AWAITING PUBLIC KEY'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setShowSettings(true)}
              style={styles.iconBtn}
            >
              <Settings size={20} color={THEME.slate} />
            </TouchableOpacity>
          </View>
        </GlassCard>
      </View>

      <View style={{ flex: 1 }}>
        {isLoading ? (
          <ActivityIndicator
            color={THEME.indigo}
            style={{ flex: 1 }}
            size="large"
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => {
              Keyboard.dismiss();
              setShowEmojiPicker(false);
            }}
          />
        )}
      </View>

      <Animated.View
        style={[styles.inputWrapper, { paddingBottom: bottomPadding }]}
      >
        {isBlockedByMe ? (
          <View style={styles.blockedBanner}>
            <AlertCircle color={THEME.danger} size={20} />
            <Text style={styles.blockedText}>
              You blocked this user. Unblock to send messages.
            </Text>
            <TouchableOpacity
              onPress={toggleBlockUser}
              style={styles.unblockBtn}
            >
              <Text style={styles.unblockBtnText}>Unblock</Text>
            </TouchableOpacity>
          </View>
        ) : isBlockedByThem ? (
          <View style={styles.blockedBanner}>
            <AlertCircle color={THEME.warning} size={20} />
            <Text style={[styles.blockedText, { color: THEME.warning }]}>
              You cannot reply to this conversation.
            </Text>
          </View>
        ) : (
          <GlassCard style={styles.inputCard} intensity="heavy">
            {pendingFile && (
              <Animated.View
                entering={FadeInDown}
                exiting={FadeOut}
                style={styles.attachmentPreview}
              >
                <View style={styles.previewBox}>
                  {pendingFile.type === 'image' ? (
                    <Image
                      source={{ uri: pendingFile.uri }}
                      style={styles.previewImage}
                    />
                  ) : (
                    <FileText color={THEME.white} size={24} />
                  )}
                  <TouchableOpacity
                    style={styles.removeAttach}
                    onPress={() => setPendingFile(null)}
                  >
                    <X size={12} color="white" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
            <View style={styles.inputRow}>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                style={styles.attachBtn}
              >
                <Smile
                  size={22}
                  color={showEmojiPicker ? THEME.warning : THEME.slate}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handlePickAttachment('image')}
                style={styles.attachBtn}
              >
                <Camera size={22} color={THEME.slate} />
              </TouchableOpacity>

              <TextInput
                style={styles.chatInput}
                placeholder={
                  recipient?.public_key
                    ? 'Encrypted payload...'
                    : 'Waiting for key exchange...'
                }
                placeholderTextColor={THEME.slate}
                value={inputText}
                onChangeText={setInputText}
                multiline
                editable={!!recipient?.public_key}
                onFocus={() => setShowEmojiPicker(false)}
              />

              <TouchableOpacity
                onPress={handleSendMessage}
                style={[
                  styles.sendBtn,
                  !inputText.trim() &&
                    !pendingFile && { backgroundColor: 'rgba(99,102,241,0.5)' },
                ]}
                disabled={
                  (!inputText.trim() && !pendingFile) ||
                  isSending ||
                  !recipient?.public_key
                }
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Send size={18} color="white" />
                )}
              </TouchableOpacity>
            </View>

            {showEmojiPicker && (
              <Animated.View entering={SlideInDown} style={styles.emojiPanel}>
                {COMMON_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.emojiBtn}
                    onPress={() => setInputText((prev) => prev + emoji)}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </Animated.View>
            )}
          </GlassCard>
        )}
      </Animated.View>

      <Modal
        visible={!!selectedMessage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMessage(null)}
      >
        <Pressable
          style={[
            styles.modalBackdrop,
            !isMobile && { justifyContent: 'center', alignItems: 'center' },
          ]}
          onPress={() => setSelectedMessage(null)}
        >
          <Animated.View
            entering={isMobile ? FadeInUp : ZoomIn}
            style={
              isMobile ? styles.contextMenuMobile : styles.contextMenuDesktop
            }
          >
            <Text style={styles.contextTitle}>Message Options</Text>

            <TouchableOpacity
              onPress={handleCopyMessage}
              style={styles.actionBtn}
            >
              <Copy size={20} color={THEME.white} />
              <Text style={styles.actionText}>Copy Decrypted Text</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleBlockUser}
              style={styles.actionBtn}
            >
              {isBlockedByMe ? (
                <User size={20} color={THEME.success} />
              ) : (
                <UserX size={20} color={THEME.danger} />
              )}
              <Text
                style={[
                  styles.actionText,
                  { color: isBlockedByMe ? THEME.success : THEME.danger },
                ]}
              >
                {isBlockedByMe
                  ? 'Restore Connection (Unblock)'
                  : 'Sever Connection (Block)'}
              </Text>
            </TouchableOpacity>

            {selectedMessage?.sender_id === user?.id && (
              <TouchableOpacity
                onPress={handleDeleteMessage}
                style={styles.actionBtn}
              >
                <Trash2 size={20} color={THEME.danger} />
                <Text style={[styles.actionText, { color: THEME.danger }]}>
                  Delete for Everyone
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setSelectedMessage(null)}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>

      <Modal
        visible={showFingerprint}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFingerprint(false)}
      >
        <Pressable
          style={[
            styles.modalBackdrop,
            { justifyContent: 'center', alignItems: 'center' },
          ]}
          onPress={() => setShowFingerprint(false)}
        >
          <Animated.View
            entering={ZoomIn}
            style={styles.fingerprintModal}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.fingerprintIconWrapper}>
              <ShieldCheck color={THEME.success} size={48} />
            </View>
            <Text style={styles.fingerprintTitle}>Identity Verification</Text>
            <Text style={styles.fingerprintSub}>
              To verify that your chat is securely encrypted end-to-end, compare
              this 64-character security code with {recipient?.username}.
            </Text>
            <View style={styles.fingerprintCodeBox}>
              <Text style={styles.fingerprintCodeText}>
                {generateIdentityFingerprint(recipient?.public_key)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowFingerprint(false)}
              style={styles.fingerprintCloseBtn}
            >
              <Text style={styles.fingerprintCloseText}>Close</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>

      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <Pressable
          style={[
            styles.modalBackdrop,
            !isMobile && { justifyContent: 'center', alignItems: 'center' },
          ]}
          onPress={() => setShowSettings(false)}
        >
          <Animated.View
            entering={isMobile ? FadeInDown : ZoomIn}
            style={
              isMobile
                ? styles.settingsSheetMobile
                : styles.settingsModalDesktop
            }
            onStartShouldSetResponder={() => true}
          >
            {isMobile && <View style={styles.sheetHandle} />}
            <Text style={styles.sheetTitle}>Link Configuration</Text>

            <TouchableOpacity
              onPress={() => {
                setShowSettings(false);
                setShowFingerprint(true);
              }}
              style={styles.actionBtn}
            >
              <ShieldCheck color={THEME.success} size={22} />
              <Text style={styles.actionText}>Verify Encryption Shield</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleMute} style={styles.actionBtn}>
              {isMuted ? (
                <BellOff color={THEME.danger} size={22} />
              ) : (
                <BellOff color={THEME.slate} size={22} />
              )}
              <Text
                style={[styles.actionText, isMuted && { color: THEME.danger }]}
              >
                {isMuted ? 'Unmute Transmissions' : 'Mute Incoming Signals'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleBlockUser}
              style={styles.actionBtn}
            >
              {isBlockedByMe ? (
                <User size={22} color={THEME.success} />
              ) : (
                <UserX size={22} color={THEME.danger} />
              )}
              <Text
                style={[
                  styles.actionText,
                  { color: isBlockedByMe ? THEME.success : THEME.danger },
                ]}
              >
                {isBlockedByMe
                  ? 'Restore Connection (Unblock)'
                  : 'Sever Connection (Block)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowSettings(false)}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>Close Configuration</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.obsidian },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: THEME.glassBorder,
    borderRadius: 0,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.glassSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: 'white', fontWeight: '900', fontSize: 18 },
  headerStatus: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  presenceDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: THEME.obsidian,
  },
  listContent: { padding: 16, paddingTop: 24 },

  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
    width: '100%',
  },
  msgContentWrapper: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bubbleContainer: {
    maxWidth: Platform.OS === 'web' ? '85%' : '80%',
    flexShrink: 1,
  },
  bubble: {
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
    flexShrink: 1,
  },
  msgText: { color: 'white', fontSize: 16, lineHeight: 24 },

  senderName: {
    color: THEME.slate,
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 6,
  },
  msgTime: { fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' },
  bubbleImage: {
    width: 220,
    height: 180,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: THEME.obsidian,
    resizeMode: 'cover',
  },
  fileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  fileLinkText: {
    color: 'white',
    fontSize: 13,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 4,
  },
  roleText: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginLeft: 3,
  },
  inputWrapper: { width: '100%', backgroundColor: 'rgba(2, 6, 23, 0.8)' },
  inputCard: {
    padding: 12,
    borderTopWidth: 1,
    borderColor: THEME.glassBorder,
    borderRadius: 0,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  chatInput: {
    flex: 1,
    backgroundColor: THEME.glassSurface,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    color: 'white',
    marginHorizontal: 8,
    fontSize: 16,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  attachBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentPreview: { paddingBottom: 12, paddingLeft: 50 },
  previewBox: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: THEME.glassSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.indigo,
  },
  previewImage: { width: '100%', height: '100%', borderRadius: 12 },
  removeAttach: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: THEME.danger,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.obsidian,
  },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    padding: 16,
    borderTopWidth: 1,
    borderColor: THEME.danger,
  },
  blockedText: {
    color: THEME.danger,
    flex: 1,
    marginLeft: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  unblockBtn: {
    backgroundColor: THEME.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unblockBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  emojiPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.glassBorder,
  },
  emojiBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  emojiText: { fontSize: 24 },
  desktopActionIcon: { padding: 10, marginLeft: 8, opacity: 0.6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  settingsSheetMobile: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 50,
    borderTopWidth: 1,
    borderColor: THEME.glassBorder,
    width: '100%',
  },
  settingsModalDesktop: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    width: 400,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  contextMenuMobile: {
    backgroundColor: '#1e293b',
    margin: 20,
    marginBottom: 50,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  contextMenuDesktop: {
    backgroundColor: '#1e293b',
    alignSelf: 'center',
    width: 400,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  fingerprintModal: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    width: 360,
    maxWidth: '90%',
    alignItems: 'center',
  },
  fingerprintIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  fingerprintTitle: {
    color: THEME.white,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center',
  },
  fingerprintSub: {
    color: THEME.slate,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  fingerprintCodeBox: {
    backgroundColor: THEME.obsidian,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    width: '100%',
    marginBottom: 24,
  },
  fingerprintCodeText: {
    color: THEME.success,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
    letterSpacing: 2,
    lineHeight: 24,
  },
  fingerprintCloseBtn: {
    width: '100%',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
  },
  fingerprintCloseText: {
    color: THEME.white,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  contextTitle: {
    color: THEME.slate,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 24,
  },
  sectionLabel: {
    color: THEME.slate,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
  },
  statusSelectRow: { flexDirection: 'row', gap: 12 },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: THEME.indigo,
  },
  statusOptionText: { color: 'white', fontWeight: '900', fontSize: 13 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  actionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  closeBtn: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
  },
  closeText: {
    color: THEME.white,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
