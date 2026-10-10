import React, { useEffect, useState } from 'react';
import { Alert, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, borderRadius } from '@/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { donorService } from '../services/donorService';

interface CallRecord { id: string; donorId: string; startedAt: string; endedAt?: string; status: 'ended' | 'expired' | 'failed'; }
const historyKey = 'lifeline.call-history';
const expiryMs = 15 * 60 * 1000;

export default function CallModalScreen() {
  const { donorId = '' } = useLocalSearchParams<{ donorId: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [proxyNumber, setProxyNumber] = useState('');
  const [expiresAt, setExpiresAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [history, setHistory] = useState<CallRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeCallId, setActiveCallId] = useState('');
  const [callStartedAt, setCallStartedAt] = useState('');
  const [callEnded, setCallEnded] = useState(false);
  const isWeb = typeof window !== 'undefined';

  useEffect(() => {
    void AsyncStorage.getItem(historyKey).then((value) => {
      if (value) setHistory(JSON.parse(value));
    });
  }, []);

  useEffect(() => {
    if (!expiresAt) return undefined;
    const timer = setInterval(() => setRemaining(Math.max(0, expiresAt - Date.now())), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const saveRecord = async (record: CallRecord) => {
    const next = [record, ...history].slice(0, 20);
    setHistory(next);
    await AsyncStorage.setItem(historyKey, JSON.stringify(next));
  };

  const start = async () => {
    if (!token || !donorId) {
      setError(!token ? 'Please sign in before starting a private call.' : 'Please select a donor first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const call = await donorService.startCall(token, donorId);
      const callId = `call-${Date.now()}`;
      const startedAt = new Date().toISOString();
      const expiry = Date.now() + expiryMs;
      setActiveCallId(callId);
      setCallStartedAt(startedAt);
      setCallEnded(false);
      setProxyNumber(call.proxyNumber);
      setExpiresAt(expiry);
      setRemaining(expiry - Date.now());
      if (!isWeb) {
        const phoneUrl = `tel:${call.proxyNumber}`;
        if (!(await Linking.canOpenURL(phoneUrl))) throw new Error('This device cannot place phone calls.');
        await Linking.openURL(phoneUrl);
      }
      if (!isWeb) {
        await saveRecord({ id: callId, donorId, startedAt: new Date().toISOString(), status: 'ended', endedAt: new Date().toISOString() });
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not start the private call.';
      setError(message);
      await saveRecord({ id: `call-${Date.now()}`, donorId, startedAt: new Date().toISOString(), status: 'failed', endedAt: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/dashboard' as never);
    }
  };

  const endCall = async () => {
    if (!activeCallId || callEnded) {
      close();
      return;
    }
    setCallEnded(true);
    setExpiresAt(0);
    setRemaining(0);
    await saveRecord({
      id: activeCallId,
      donorId,
      startedAt: callStartedAt || new Date().toISOString(),
      endedAt: new Date().toISOString(),
      status: 'ended',
    });
  };

  const report = () => Alert.alert('Report call problem', 'Please describe the issue to the support team.', [{ text: 'Close' }, { text: 'Contact support', onPress: () => Alert.alert('Support', 'Please contact support@lifeline.lk.') }]);
  const minutes = Math.floor(remaining / 60000).toString().padStart(2, '0');
  const seconds = Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0');

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}><Text style={styles.title}>{callEnded ? 'Call ended' : proxyNumber ? 'Call ready' : 'Start private call?'}</Text><TouchableOpacity onPress={close}><Ionicons name="close" size={22} color={colors.text} /></TouchableOpacity></View>
          <Text style={styles.text}>{callEnded ? 'The private call has ended. You can start another call if you still need help.' : proxyNumber ? `Secure number: ${proxyNumber}` : 'The donor phone number stays hidden. A temporary secure number will connect you.'}</Text>
          {proxyNumber ? <View style={styles.expiry}><Ionicons name="time-outline" size={18} color={colors.primary} /><Text style={styles.expiryText}>{remaining ? `Number expires in ${minutes}:${seconds}` : 'Number expired. Start a new call.'}</Text></View> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {proxyNumber && isWeb && remaining > 0 && !callEnded ? <TouchableOpacity style={styles.start} onPress={() => { void endCall(); }}><Text style={styles.startText}>End call</Text></TouchableOpacity> : callEnded ? <TouchableOpacity style={styles.start} onPress={close}><Text style={styles.startText}>Done</Text></TouchableOpacity> : <TouchableOpacity disabled={loading || Boolean(proxyNumber && remaining === 0)} style={[styles.start, (loading || (proxyNumber && remaining === 0)) && styles.disabled]} onPress={() => { void start(); }}><Text style={styles.startText}>{loading ? 'Connecting...' : proxyNumber ? 'Retry call' : 'Start call'}</Text></TouchableOpacity>}
          <TouchableOpacity style={styles.historyButton} onPress={() => setShowHistory(!showHistory)}><Ionicons name="time-outline" size={17} color={colors.primary} /><Text style={styles.historyText}>Call history ({history.length})</Text></TouchableOpacity>
          <TouchableOpacity style={styles.reportButton} onPress={report}><Text style={styles.reportText}>Report call problem</Text></TouchableOpacity>
          {!showHistory && <TouchableOpacity style={styles.cancel} onPress={close}><Text style={styles.cancelText}>Close</Text></TouchableOpacity>}
          {showHistory && <ScrollView style={styles.historyList}>{history.length === 0 ? <Text style={styles.muted}>No call history yet.</Text> : history.map((record) => <View style={styles.historyRow} key={record.id}><Text style={styles.historyDate}>{new Date(record.startedAt).toLocaleString()}</Text><Text style={record.status === 'failed' ? styles.failed : styles.ended}>{record.status === 'failed' ? 'Failed' : record.status === 'expired' ? 'Expired' : 'Call ended'}</Text></View>)}</ScrollView>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 420, maxHeight: '90%', backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontSize: 21, fontWeight: '800' },
  text: { color: colors.textSecondary, lineHeight: 22, marginVertical: spacing.md },
  expiry: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primaryTonal, padding: spacing.sm, borderRadius: borderRadius.sm, marginBottom: spacing.md },
  expiryText: { color: colors.primaryDark, fontWeight: '800' },
  error: { color: colors.danger, lineHeight: 20, marginBottom: spacing.md },
  start: { minHeight: 48, backgroundColor: colors.primary, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.55 },
  startText: { color: colors.textInverted, fontWeight: '800' },
  historyButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  historyText: { color: colors.primary, fontWeight: '800' },
  reportButton: { alignItems: 'center', paddingVertical: spacing.sm },
  reportText: { color: colors.danger, fontWeight: '700' },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.textMuted, fontWeight: '700' },
  historyList: { maxHeight: 180, marginTop: spacing.sm },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  historyDate: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  ended: { color: colors.success, fontWeight: '700' },
  failed: { color: colors.danger, fontWeight: '700' },
  muted: { color: colors.textMuted, textAlign: 'center', padding: spacing.md },
});
