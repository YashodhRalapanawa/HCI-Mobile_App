import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, borderRadius, spacing } from '@/theme';
import { useSusSubmit } from './hooks';
import { susStrings } from './strings';

const strings = susStrings.en;
interface SusOverlayContextValue { open: () => void; close: () => void }
const SusOverlayContext = createContext<SusOverlayContextValue | null>(null);

export function SusOverlayProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [score, setScore] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [agreement, setAgreement] = useState<'agree' | 'disagree' | undefined>();
  const [submitted, setSubmitted] = useState(false);
  const submission = useSusSubmit();
  const open = useCallback(() => {
    setScore(null); setAgreement(undefined); setSubmitted(false); setVisible(true);
  }, []);
  const close = useCallback(() => setVisible(false), []);
  const value = useMemo(() => ({ open, close }), [open, close]);
  const submit = async () => {
    if (!score) return;
    const result = await submission.submit({
      question: strings.promptTitle,
      score,
      agreeStatement: agreement,
    });
    if (result) {
      setSubmitted(true);
      setTimeout(() => close(), 1600);
    }
  };
  return (
    <SusOverlayContext.Provider value={value}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.backdrop}>
          <View style={styles.card} accessibilityViewIsModal>
            {submitted ? (
              <View style={styles.success}><Text style={styles.successMark}>{strings.successIcon}</Text><Text style={styles.successText}>{strings.submitSuccess}</Text></View>
            ) : (
              <>
                <View style={styles.heading}><Text style={styles.title}>{strings.promptTitle}</Text><TouchableOpacity onPress={close} accessibilityRole="button" accessibilityLabel={strings.close}><Text style={styles.close}>{strings.closeIcon}</Text></TouchableOpacity></View>
                <Text style={styles.body}>{strings.promptBody}</Text>
                <View style={styles.scoreRow}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <TouchableOpacity key={value} onPress={() => setScore(value as 1 | 2 | 3 | 4 | 5)} style={[styles.scoreButton, score === value && styles.selectedScore]} accessibilityRole="button" accessibilityLabel={strings.scoreLabels[value - 1]} accessibilityState={{ selected: score === value }}>
                      <Text style={[styles.scoreText, score === value && styles.selectedScoreText]}>{value}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.labels}><Text style={styles.label}>{strings.scoreLabels[0]}</Text><Text style={styles.label}>{strings.scoreLabels[4]}</Text></View>
                <Text style={styles.statement}>{strings.frequencyStatement}</Text>
                <View style={styles.agreementRow}>
                  {(['agree', 'disagree'] as const).map((choice) => (
                    <TouchableOpacity key={choice} onPress={() => setAgreement(choice)} style={[styles.agreementButton, agreement === choice && styles.selectedAgreement]} accessibilityRole="button" accessibilityLabel={strings[choice]} accessibilityState={{ selected: agreement === choice }}>
                      <Text style={styles.agreementText}>{strings[choice]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {submission.error ? <Text style={styles.error}>{submission.error}</Text> : null}
                {submission.isOfflineDemo ? <Text style={styles.offline}>{strings.offlineDemo}</Text> : null}
                <TouchableOpacity style={[styles.submitButton, (!score || submission.loading) && styles.disabled]} disabled={!score || submission.loading} onPress={() => void submit()} accessibilityRole="button" accessibilityLabel={submission.loading ? strings.submitting : strings.submit}>
                  <Text style={styles.submitText}>{submission.loading ? strings.submitting : strings.submit}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SusOverlayContext.Provider>
  );
}

export function useSusOverlay(): SusOverlayContextValue {
  const context = useContext(SusOverlayContext);
  if (!context) throw new Error('useSusOverlay must be used inside SusOverlayProvider.');
  return context;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(15, 23, 42, 0.65)' },
  card: { padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.card },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, color: colors.text, fontSize: 20, fontWeight: '800' },
  close: { color: colors.textMuted, fontSize: 30, lineHeight: 32 },
  body: { marginTop: spacing.sm, color: colors.textSecondary, lineHeight: 20 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  scoreButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.full, backgroundColor: colors.secondarySoft },
  selectedScore: { backgroundColor: colors.primary },
  scoreText: { color: colors.text, fontSize: 17, fontWeight: '800' },
  selectedScoreText: { color: colors.textInverted },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  label: { maxWidth: '48%', color: colors.textMuted, fontSize: 11 },
  statement: { marginTop: spacing.lg, color: colors.text, fontSize: 14, fontWeight: '700' },
  agreementRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  agreementButton: { minHeight: 48, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.md, backgroundColor: colors.secondarySoft },
  selectedAgreement: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary },
  agreementText: { color: colors.text, fontWeight: '700' },
  error: { marginTop: spacing.sm, color: colors.danger, fontSize: 13 },
  offline: { marginTop: spacing.sm, color: colors.tertiaryDark, fontSize: 12 },
  submitButton: { minHeight: 52, marginTop: spacing.lg, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.md, backgroundColor: colors.primary },
  disabled: { opacity: 0.45 },
  submitText: { color: colors.textInverted, fontWeight: '800' },
  success: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  successMark: { color: colors.success, fontSize: 56, fontWeight: '800' },
  successText: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
});
