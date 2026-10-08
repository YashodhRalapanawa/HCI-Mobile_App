import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, borderRadius, spacing } from '@/theme';
import { campaignsStrings } from './strings';

const strings = campaignsStrings.en;

export function RegistrationSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ title?: string; venue?: string; referenceNo?: string }>();
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.icon}><Ionicons name="checkmark" size={48} color={colors.textInverted} /></View>
        <Text style={styles.title}>{strings.successTitle}</Text>
        <Text style={styles.campaign}>{params.title ?? strings.title}</Text>
        <Text style={styles.detail}>{strings.venue}: {params.venue ?? '—'}</Text>
        <Text style={styles.referenceLabel}>{strings.referenceNumber}</Text>
        <Text style={styles.reference}>{params.referenceNo ?? '—'}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/campaigns')} accessibilityRole="button" accessibilityLabel={strings.backToCampaigns}>
          <Text style={styles.buttonText}>{strings.backToCampaigns}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  icon: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center', borderRadius: 44, backgroundColor: colors.success },
  title: { marginTop: spacing.lg, color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  campaign: { marginTop: spacing.md, color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  detail: { marginTop: spacing.sm, color: colors.textSecondary, textAlign: 'center' },
  referenceLabel: { marginTop: spacing.xl, color: colors.textMuted, fontSize: 13 },
  reference: { marginTop: spacing.xs, color: colors.primary, fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  button: { width: '100%', minHeight: 52, marginTop: spacing.xl, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.md, backgroundColor: colors.primary },
  buttonText: { color: colors.textInverted, fontWeight: '800' },
});
