import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { colors, spacing, borderRadius } from '@/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { donorService } from '../services/donorService';
import type { ChatMessage } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export default function ChatScreen() {
  const { donorId = '', donorName = 'Donor' } = useLocalSearchParams<{ donorId: string; donorName: string }>();
  const { token, user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const [chatId, setChatId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [typing, setTyping] = useState(false);
  const [online] = useState(true);
  const [lastSeen] = useState(new Date());

  useEffect(() => {
    let active = true;
    const loadChat = async () => {
      setLoading(true);
      setError('');
      try {
        const id = await donorService.getChat(token, donorId);
        if (active) setChatId(id);
        const items = await donorService.messages(token, id);
        if (active) setMessages(items);
      } catch {
        if (active) setError('Could not open this chat. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadChat();
    return () => { active = false; };
  }, [donorId, token]);

  const send = async () => {
    const clean = text.trim();
    if (!clean || !chatId || sending) return;
    setSending(true);
    setError('');
    try {
      const message = await donorService.sendMessage(token, chatId, clean);
      setMessages((old) => [...old, message]);
      setText('');
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    } catch {
      setError('Message could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const quickReply = (reply: string) => {
    setText(reply);
    setTyping(false);
  };

  const edit = (message: ChatMessage) => {
    if (message.senderId !== (user?.id ?? 'me')) return;
    const next = Platform.OS === 'web' && typeof window !== 'undefined' ? window.prompt('Edit message', message.text)?.trim() : message.text;
    if (!next || next === message.text) return;
    void donorService.editMessage(token, chatId, message._id, next)
      .then((updated) => setMessages((old) => old.map((item) => item._id === updated._id ? updated : item)))
      .catch(() => setError('Message could not be edited.'));
  };

  const remove = (message: ChatMessage) => {
    if (message.senderId !== (user?.id ?? 'me')) return;
    void donorService.deleteMessage(token, chatId, message._id)
      .then(() => setMessages((old) => old.filter((item) => item._id !== message._id)))
      .catch(() => setError('Message could not be deleted.'));
  };

  return <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><AppHeader title={String(donorName)} rightElement={<TouchableOpacity onPress={() => router.push({ pathname: '/call-modal', params: { donorId } })} accessibilityLabel="Start private call"><Ionicons name="call-outline" size={23} color={colors.primary} /></TouchableOpacity>} /><View style={styles.presence}><View style={[styles.presenceDot, online ? styles.online : styles.offline]} /><Text style={styles.presenceText}>{online ? 'Online' : `Last seen ${lastSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}</Text></View><Text style={styles.banner}>{'Phone numbers are hidden for safety.'}</Text>{error ? <Text style={styles.error}>{error}</Text> : null}<ScrollView ref={scroll} contentContainerStyle={styles.messages}>{loading ? <Text style={styles.status}>Opening chat...</Text> : messages.length === 0 ? <Text style={styles.status}>No messages yet. Start the conversation.</Text> : messages.map((message) => { const mine = message.senderId === (user?.id ?? 'me'); return <TouchableOpacity key={message._id} onPress={() => edit(message)} onLongPress={() => remove(message)} style={[styles.bubble, mine ? styles.mine : styles.theirs]}><Text style={[styles.messageText, mine ? styles.mineText : styles.theirsText]}>{message.text}</Text><Text style={[styles.time, mine ? styles.mineText : styles.theirsText]}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>{mine ? <Text style={styles.receipt}>✓ Delivered  •  ✓✓ Read</Text> : null}</TouchableOpacity>; })}{typing ? <Text style={styles.typing}>Donor is typing...</Text> : null}</ScrollView><View style={styles.quickReplies}>{['I can donate', 'Please share hospital location', 'I’m on the way'].map((reply) => <TouchableOpacity key={reply} style={styles.quickReply} onPress={() => quickReply(reply)}><Text style={styles.quickReplyText}>{reply}</Text></TouchableOpacity>)}</View><View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}><TextInput value={text} onFocus={() => { setTyping(true); setTimeout(() => setTyping(false), 2500); }} onChangeText={setText} maxLength={1000} placeholder="Write a message..." style={styles.input} editable={!sending} onSubmitEditing={() => { void send(); }} /><TouchableOpacity disabled={sending} onPress={() => { void send(); }} style={[styles.send, sending && styles.disabled]} accessibilityLabel="Send message"><Ionicons name="send" size={20} color={colors.textInverted} /></TouchableOpacity></View></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, presence: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 5, backgroundColor: colors.card }, presenceDot: { width: 8, height: 8, borderRadius: 4 }, online: { backgroundColor: colors.success }, offline: { backgroundColor: colors.textMuted }, presenceText: { color: colors.textMuted, fontSize: 12 }, banner: { backgroundColor: colors.primaryTonal, color: colors.primaryDark, padding: spacing.sm, textAlign: 'center', fontWeight: '700' }, error: { color: colors.danger, textAlign: 'center', padding: spacing.sm }, status: { color: colors.textMuted, textAlign: 'center', paddingTop: spacing.lg }, messages: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 }, bubble: { maxWidth: '80%', padding: spacing.sm, borderRadius: borderRadius.md }, mine: { alignSelf: 'flex-end', backgroundColor: colors.primary }, theirs: { alignSelf: 'flex-start', backgroundColor: colors.card }, messageText: { flexShrink: 1 }, mineText: { color: colors.textInverted }, theirsText: { color: colors.text }, time: { opacity: 0.7, fontSize: 10, alignSelf: 'flex-end', marginTop: 3 }, receipt: { color: colors.textInverted, opacity: 0.8, fontSize: 10, alignSelf: 'flex-end', marginTop: 2 }, typing: { color: colors.textMuted, fontStyle: 'italic', fontSize: 12 }, quickReplies: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: 5, backgroundColor: colors.card }, quickReply: { borderWidth: 1, borderColor: colors.primarySoft, borderRadius: borderRadius.full, paddingHorizontal: 9, paddingVertical: 6 }, quickReplyText: { color: colors.primaryDark, fontSize: 11, fontWeight: '700' }, composer: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.card, gap: spacing.sm }, input: { flex: 1, minWidth: 0, minHeight: 44, maxHeight: 120, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, color: colors.text }, send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, disabled: { opacity: 0.55 } });
