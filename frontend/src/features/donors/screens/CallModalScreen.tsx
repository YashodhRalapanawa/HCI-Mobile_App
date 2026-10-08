import React, { useState } from 'react';
import { Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, borderRadius } from '@/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { donorService } from '../services/donorService';
export default function CallModalScreen() {
  const { donorId = '' } = useLocalSearchParams<{ donorId: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    if (!token) {
      setError('Please sign in before starting a private call.');
      return;
    }
    if (!donorId) {
      setError('This call cannot start because the donor was not selected.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const call = await donorService.startCall(token, donorId);
      const phoneUrl = `tel:${call.proxyNumber}`;
      if (!(await Linking.canOpenURL(phoneUrl))) {
        setError(Platform.OS === 'web' ? 'Calling is not available in this web preview. Open the app on a phone.' : 'This device cannot place phone calls.');
        return;
      }
      await Linking.openURL(phoneUrl);
      router.back();
    } catch {
      setError('Could not start the private call. Check that the backend is running and try again.');
    } finally {
      setLoading(false);
    }
  };

  return <Modal transparent animationType="fade" visible><View style={styles.overlay}><View style={styles.card}><Text style={styles.title}>Start private call?</Text><Text style={styles.text}>The donor phone number stays hidden. A temporary secure number will connect you.</Text>{error ? <Text style={styles.error}>{error}</Text> : null}<TouchableOpacity disabled={loading} style={[styles.start, loading && styles.disabled]} onPress={() => { void start(); }}><Text style={styles.startText}>{loading ? 'Connecting...' : 'Start call'}</Text></TouchableOpacity><TouchableOpacity style={styles.cancel} onPress={() => router.back()}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity></View></View></Modal>;
}
const styles = StyleSheet.create({ overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg }, card: { width: '100%', maxWidth: 420, backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.lg }, title: { color: colors.text, fontSize: 21, fontWeight: '800' }, text: { color: colors.textSecondary, lineHeight: 22, marginVertical: spacing.md }, error: { color: colors.danger, lineHeight: 20, marginBottom: spacing.md }, start: { minHeight: 48, backgroundColor: colors.primary, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.55 }, startText: { color: colors.textInverted, fontWeight: '800' }, cancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center' }, cancelText: { color: colors.textMuted, fontWeight: '700' } });
