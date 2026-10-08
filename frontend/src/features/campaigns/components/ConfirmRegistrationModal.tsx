import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, borderRadius, spacing } from '@/theme';
import { campaignsStrings } from '../strings';

const strings = campaignsStrings.en;

export function ConfirmRegistrationModal({
  campaignTitle,
  visible,
  loading,
  onConfirm,
  onCancel,
}: {
  campaignTitle: string;
  visible: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title}>{strings.registerPrompt(campaignTitle)}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={loading} accessibilityRole="button" accessibilityLabel={strings.cancel}>
              <Text style={styles.cancelText}>{strings.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={onConfirm} disabled={loading} accessibilityRole="button" accessibilityLabel={strings.yesRegister}>
              <Text style={styles.confirmText}>{loading ? 'Registering…' : strings.yesRegister}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(15, 23, 42, 0.65)' },
  card: { width: '100%', padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.card },
  title: { color: colors.text, fontSize: 19, lineHeight: 27, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelButton: { minHeight: 48, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.md, backgroundColor: colors.secondarySoft },
  cancelText: { color: colors.text, fontWeight: '700' },
  confirmButton: { minHeight: 48, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.md, backgroundColor: colors.primary },
  confirmText: { color: colors.textInverted, fontWeight: '800' },
});
