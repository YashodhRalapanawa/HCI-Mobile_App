import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { colors, spacing } from '@/theme';
import { useCampaigns, useCampaignRegistration } from './hooks';
import type { Campaign } from './types';
import { campaignsStrings } from './strings';
import { CampaignCard, ConfirmRegistrationModal } from './components';
import { EmptyState } from '@/features/home/components/EmptyState';
import { ErrorState } from '@/features/home/components/ErrorState';
import { LoadingSkeleton } from '@/features/home/components/LoadingSkeleton';

const strings = campaignsStrings.en;

export function CampaignsScreen() {
  const router = useRouter();
  const campaigns = useCampaigns();
  const registration = useCampaignRegistration();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={strings.title} />
      <ScrollView contentContainerStyle={styles.content}>
        {campaigns.isOfflineDemo ? <Text style={styles.banner}>{strings.offlineDemo}</Text> : null}
        {campaigns.loading ? <LoadingSkeleton rows={3} /> : campaigns.error ? (
          <ErrorState message={campaigns.error} actionLabel={strings.tryAgain} onRetry={() => void campaigns.refetch()} />
        ) : campaigns.data.length === 0 ? <EmptyState title={strings.noCampaigns} /> : (
          <View style={styles.list}>{campaigns.data.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} registering={registration.loading && selectedCampaign?.id === campaign.id} onRegister={() => setSelectedCampaign(campaign)} />
          ))}</View>
        )}
      </ScrollView>
      {selectedCampaign ? (
        <ConfirmRegistrationModal
          campaignTitle={selectedCampaign.title}
          visible
          loading={registration.loading}
          onCancel={() => setSelectedCampaign(null)}
          onConfirm={async () => {
            const referenceNo = await registration.register(selectedCampaign.id);
            if (referenceNo) {
              setSelectedCampaign(null);
              router.push(`/campaigns/success?title=${encodeURIComponent(selectedCampaign.title)}&venue=${encodeURIComponent(selectedCampaign.venue)}&referenceNo=${encodeURIComponent(referenceNo)}`);
            } else if (registration.error) {
              Alert.alert(strings.registrationFailed, registration.error);
            }
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.md },
  banner: { marginBottom: spacing.md, padding: spacing.sm, backgroundColor: colors.tertiaryLight, color: colors.tertiaryDark, fontWeight: '700' },
  list: { gap: spacing.sm },
});
