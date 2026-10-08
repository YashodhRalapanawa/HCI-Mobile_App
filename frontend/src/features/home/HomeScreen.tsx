import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { colors, borderRadius, spacing } from '@/theme';
import { useHomeSummary } from './hooks';
import { useCampaigns } from '@/features/campaigns/hooks';
import { homeStrings } from './strings';
import { CampaignCard } from '@/features/campaigns/components/CampaignCard';
import { EmptyState } from './components/EmptyState';
import { ErrorState } from './components/ErrorState';
import { LoadingSkeleton } from './components/LoadingSkeleton';

const strings = homeStrings.en;

export function HomeScreen() {
  const router = useRouter();
  const summary = useHomeSummary({ bloodGroup: 'O+' });
  const campaigns = useCampaigns();
  const criticalAlert = summary.data?.criticalAlerts[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={strings.header} showBack={false} />
      <ScrollView contentContainerStyle={styles.content}>
        {summary.isOfflineDemo || campaigns.isOfflineDemo ? <Text style={styles.offlineBanner}>{strings.offlineDemo}</Text> : null}
        {summary.loading ? <LoadingSkeleton rows={3} /> : summary.error ? (
          <ErrorState message={summary.error} actionLabel={strings.tryAgain} onRetry={() => void summary.refetch()} />
        ) : summary.data ? (
          <View style={styles.cards}>
            <View style={styles.card}><Text style={styles.cardValue}>{summary.data.nearbyBanks}</Text><Text style={styles.cardLabel}>{strings.nearbyBanks}</Text></View>
            <View style={styles.card}><Text style={styles.cardValue}>{strings.yourType}</Text></View>
            <View style={styles.card}><Text style={styles.cardValue}>{campaigns.data.length}</Text><Text style={styles.cardLabel}>{strings.upcomingCampaigns}</Text></View>
          </View>
        ) : <EmptyState title={strings.noSummary} />}

        {criticalAlert ? (
          <View style={styles.alertCard} accessibilityRole="alert">
            <Text style={styles.alertTitle}>{strings.critical}</Text>
            <Text style={styles.alertText}>{strings.criticalMessage(criticalAlert.bloodGroup, criticalAlert.bankName)}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.requestButton}
          onPress={() => router.push('/request/new')}
          accessibilityRole="button"
          accessibilityLabel={strings.requestBlood}
        >
          <Text style={styles.requestText}>{strings.requestBlood}</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{strings.upcomingCampaigns}</Text>
          <TouchableOpacity onPress={() => router.push('/campaigns')} accessibilityRole="button" accessibilityLabel={strings.viewCampaigns}>
            <Text style={styles.link}>{strings.viewCampaigns}</Text>
          </TouchableOpacity>
        </View>
        {campaigns.loading ? <LoadingSkeleton rows={1} /> : campaigns.error ? (
          <ErrorState message={campaigns.error} actionLabel={strings.tryAgain} onRetry={() => void campaigns.refetch()} />
        ) : campaigns.data[0] ? (
          <CampaignCard campaign={campaigns.data[0]} />
        ) : <EmptyState title={strings.noSummary} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.md, gap: spacing.md },
  offlineBanner: { padding: spacing.sm, borderRadius: borderRadius.sm, backgroundColor: colors.tertiaryLight, color: colors.tertiaryDark, fontSize: 13, fontWeight: '700' },
  cards: { gap: spacing.sm },
  card: { minHeight: 78, justifyContent: 'center', padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  cardValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  cardLabel: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: 14 },
  alertCard: { padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.dangerSoft, borderLeftWidth: 4, borderLeftColor: colors.danger },
  alertTitle: { color: colors.danger, fontSize: 15, fontWeight: '800' },
  alertText: { marginTop: spacing.xs, color: colors.text, fontSize: 14, lineHeight: 20 },
  requestButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.md, backgroundColor: colors.primary },
  requestText: { color: colors.textInverted, fontSize: 16, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  link: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
