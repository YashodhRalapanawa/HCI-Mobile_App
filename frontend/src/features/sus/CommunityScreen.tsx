import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { colors, borderRadius, spacing } from '@/theme';
import { useSusOverlay } from './SusOverlay';
import { susStrings } from './strings';

const strings = susStrings.en;

export function CommunityScreen() {
  const overlay = useSusOverlay();
  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={strings.communityTitle} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.activityCard}><Text style={styles.count}>{strings.communityMemberCount}</Text><Text style={styles.activity}>{strings.activityCount}</Text></View>
        <View style={styles.promptCard}><Text style={styles.promptTitle}>{strings.promptTitle}</Text><Text style={styles.promptBody}>{strings.promptBody}</Text><TouchableOpacity style={styles.button} onPress={overlay.open} accessibilityRole="button" accessibilityLabel={strings.openSurvey}><Text style={styles.buttonText}>{strings.openSurvey}</Text></TouchableOpacity></View>
        <View style={styles.feedback}><Text style={styles.sectionTitle}>{strings.title}</Text><Text style={styles.feedbackText}>{strings.thanks}. Your voice helps us improve LifeLine LK.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.md, gap: spacing.md },
  activityCard: { padding: spacing.lg, alignItems: 'center', borderRadius: borderRadius.md, backgroundColor: colors.primaryLight },
  count: { color: colors.primaryDark, fontSize: 32, fontWeight: '800' },
  activity: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: 15 },
  promptCard: { padding: spacing.lg, borderRadius: borderRadius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  promptTitle: { color: colors.text, fontSize: 19, fontWeight: '800' },
  promptBody: { marginTop: spacing.xs, color: colors.textSecondary, lineHeight: 20 },
  button: { minHeight: 50, marginTop: spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.md, backgroundColor: colors.primary },
  buttonText: { color: colors.textInverted, fontWeight: '800' },
  feedback: { padding: spacing.lg, borderRadius: borderRadius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  feedbackText: { marginTop: spacing.sm, color: colors.textSecondary, lineHeight: 21 },
});
