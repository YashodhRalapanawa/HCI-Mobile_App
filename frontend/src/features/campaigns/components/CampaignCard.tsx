import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, borderRadius, spacing } from '@/theme';
import type { Campaign } from '../types';
import { campaignsStrings } from '../strings';

const strings = campaignsStrings.en;

export function CampaignCard({ campaign, onRegister, registering = false }: { campaign: Campaign; onRegister?: () => void; registering?: boolean }) {
  return (
    <View style={styles.card}>
      {campaign.imageUrl ? <Image source={{ uri: campaign.imageUrl }} style={styles.image} accessibilityLabel={strings.imageLabel} /> : <View style={styles.imagePlaceholder}><Text style={styles.imageText}>{strings.brand}</Text></View>}
      <Text style={styles.title}>{campaign.title}</Text>
      <Text style={styles.description}>{campaign.description}</Text>
      <Text style={styles.detail}>{new Date(campaign.date).toLocaleDateString()} · {campaign.startTime}–{campaign.endTime}</Text>
      <Text style={styles.detail}>{campaign.venue}</Text>
      <Text style={styles.spots}>{campaign.spotsRemaining} {strings.spotsRemaining}</Text>
      {onRegister ? <TouchableOpacity style={styles.registerButton} onPress={onRegister} disabled={registering} accessibilityRole="button" accessibilityLabel={strings.registerFor(campaign.title)}>
        <Text style={styles.registerText}>{registering ? strings.registering : strings.register}</Text>
      </TouchableOpacity> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
  image: { width: '100%', height: 150, borderRadius: borderRadius.sm },
  imagePlaceholder: { width: '100%', height: 150, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.sm, backgroundColor: colors.primaryLight },
  imageText: { color: colors.primaryDark, fontSize: 18, fontWeight: '800' },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  description: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  detail: { color: colors.textMuted, fontSize: 13 },
  spots: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  registerButton: { minHeight: 48, marginTop: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.md, backgroundColor: colors.primary },
  registerText: { color: colors.textInverted, fontSize: 15, fontWeight: '800' },
});
