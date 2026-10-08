import React from 'react';
import { Alert, Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { colors, borderRadius, spacing } from '@/theme';
import { useBloodBank } from './hooks';
import { inventoryStrings } from './strings';
import type { BloodGroup, StockLevel } from './types';
import { BloodGroupChip } from './components/BloodGroupChip';
import { StockBadge } from './components/StockBadge';
import { ErrorState, LoadingSkeleton } from './components';

const strings = inventoryStrings.en;

const bloodGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
function statusFor(units: number): StockLevel {
  if (units >= 20) return 'high';
  if (units >= 8) return 'medium';
  if (units >= 1) return 'low';
  return 'out';
}

export function BankDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bank = useBloodBank(id ?? '');
  if (bank.loading) return <SafeAreaView style={styles.safeArea}><AppHeader title={strings.details} /><LoadingSkeleton rows={5} /></SafeAreaView>;
  if (bank.error || !bank.data) return <SafeAreaView style={styles.safeArea}><AppHeader title={strings.details} /><ErrorState message={bank.error ?? strings.noBanks} actionLabel={strings.tryAgain} onRetry={() => void bank.refetch()} /></SafeAreaView>;
  const details = bank.data;
  const openMaps = async () => {
    const [longitude, latitude] = details.location.coordinates;
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    try { await Linking.openURL(url); } catch (error) { console.error('[inventory] Maps link failed:', error); Alert.alert(strings.mapsError); }
  };
  const callBank = async () => {
    try { await Linking.openURL(`tel:${details.phone}`); } catch (error) { console.error('[inventory] Phone link failed:', error); Alert.alert(strings.callError); }
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={details.name} subtitle={details.district} />
      <ScrollView contentContainerStyle={styles.content}>
        {bank.isOfflineDemo ? <Text style={styles.offlineBanner}>{strings.offlineDemo}</Text> : null}
        <Text style={styles.address}>{details.address}</Text>
        <Text style={styles.info}>{details.isOpenNow ? strings.open : strings.closed} · {details.openHours}</Text>
        <Text style={styles.info}>{details.phone}</Text>
        <Text style={styles.info}>{details.email}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => void openMaps()} accessibilityRole="button" accessibilityLabel={strings.getDirections}><Text style={styles.actionText}>{strings.getDirections}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => void callBank()} accessibilityRole="button" accessibilityLabel={strings.call}><Text style={styles.actionText}>{strings.call}</Text></TouchableOpacity>
        </View>
        <Text style={styles.sectionTitle}>{strings.stock}</Text>
        <View style={styles.grid}>
          {bloodGroups.map((group) => {
            const entry = details.stock.find((item) => item.bloodGroup === group);
            const units = entry?.units ?? 0;
            const level = entry?.status ?? statusFor(units);
            return <View key={group} style={styles.stockCard}><BloodGroupChip bloodGroup={group} /><Text style={styles.units}>{units} {strings.unitsAvailable}</Text><StockBadge level={level} label={strings[level]} /></View>;
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.md, gap: spacing.sm },
  offlineBanner: { padding: spacing.sm, borderRadius: borderRadius.sm, backgroundColor: colors.tertiaryLight, color: colors.tertiaryDark, fontWeight: '700' },
  address: { color: colors.text, fontSize: 17, fontWeight: '700', lineHeight: 24 },
  info: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
  actionButton: { minHeight: 48, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.md, backgroundColor: colors.primary },
  actionText: { color: colors.textInverted, fontWeight: '800' },
  sectionTitle: { marginTop: spacing.sm, color: colors.text, fontSize: 20, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stockCard: { width: '48%', minHeight: 112, padding: spacing.sm, justifyContent: 'space-between', borderRadius: borderRadius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  units: { color: colors.textSecondary, fontSize: 13 },
});
