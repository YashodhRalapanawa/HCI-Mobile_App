import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { AppHeader } from '@/components/AppHeader';
import { AppButton } from '@/components/AppButton';
import { BottomNavBar } from '@/components/BottomNavBar';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { useAuth } from '@/features/auth/context/AuthContext';

export default function EligibilityStatusScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [questionsModal, setQuestionsModal] = useState(false);
  const [answers, setAnswers] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
    3: true,
  });

  const criteria = [
    { title: 'Age Criterion', detail: 'Must be between 18 and 60 years old', satisfied: true },
    { title: 'Body Weight', detail: `Recorded weight is ${user?.weight || 68} kg (Min. 50 kg)`, satisfied: (user?.weight || 68) >= 50 },
    { title: 'Donation Interval', detail: 'Over 90 days have elapsed since last recorded donation', satisfied: true },
    { title: 'Systemic Health', detail: 'No active cardiovascular or infectious contraindications', satisfied: true },
  ];

  const questions = [
    'Are you feeling well, active, and fully healthy today?',
    'Has it been at least 3 months since your last whole blood donation?',
    'Are you free from fever, active flu symptoms, or antibiotics this week?',
    'Are you prepared to answer official NBTS screening upon arrival?',
  ];

  const handleRetake = () => {
    setQuestionsModal(true);
  };

  const handleSaveAnswers = () => {
    setQuestionsModal(false);
    Alert.alert('Eligibility Updated', 'Your pre-donation readiness status has been confirmed.');
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Eligibility Status"
        onBack={() => router.back()}
        rightElement={<ScreenSwitcher currentScreenId={11} />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Dark Hero Card with Checkmark */}
        <View style={styles.heroCard}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          </View>
          <Text style={styles.heroTitle}>You Are Eligible to Donate</Text>
          <Text style={styles.heroSub}>
            Your health indicators and donation interval are within safe NBTS guidelines.
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>Next donation: Available immediately</Text>
          </View>
        </View>

        {/* Criteria Breakdown */}
        <Text style={styles.sectionTitle}>Eligibility Breakdown</Text>
        <View style={styles.criteriaCard}>
          {criteria.map((item, index) => (
            <View key={index} style={[styles.criteriaRow, index < criteria.length - 1 && styles.borderBottom]}>
              <View style={styles.checkIconBox}>
                <Ionicons
                  name={item.satisfied ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={item.satisfied ? colors.success : colors.danger}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.criteriaTitle}>{item.title}</Text>
                <Text style={styles.criteriaDetail}>{item.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Retake Questionnaire Section */}
        {questionsModal ? (
          <View style={styles.questionnaireCard}>
            <Text style={styles.qHeading}>Self-Assessment Pre-Check</Text>
            {questions.map((q, idx) => (
              <View key={idx} style={styles.qItem}>
                <Text style={styles.qText}>{idx + 1}. {q}</Text>
                <View style={styles.choiceRow}>
                  <TouchableOpacity
                    style={[styles.choiceBtn, answers[idx] === true && styles.choiceActive]}
                    onPress={() => setAnswers({ ...answers, [idx]: true })}
                  >
                    <Text style={[styles.choiceText, answers[idx] === true && styles.choiceTextActive]}>
                      Yes
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.choiceBtn, answers[idx] === false && styles.choiceActive]}
                    onPress={() => setAnswers({ ...answers, [idx]: false })}
                  >
                    <Text style={[styles.choiceText, answers[idx] === false && styles.choiceTextActive]}>
                      No
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <AppButton
              title="Save Self-Assessment"
              variant="primary"
              onPress={handleSaveAnswers}
              style={{ marginTop: 12 }}
            />
          </View>
        ) : (
          <AppButton
            title="Retake Eligibility Assessment"
            variant="outline"
            icon="clipboard-outline"
            onPress={handleRetake}
            style={styles.retakeBtn}
          />
        )}
      </ScrollView>

      <BottomNavBar activeTab="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 30,
  },
  heroCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  checkCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
  },
  statusBadge: {
    marginTop: 14,
    backgroundColor: '#064E3B',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    color: '#6EE7B7',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
  },
  criteriaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  criteriaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  checkIconBox: {
    marginRight: 12,
  },
  criteriaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  criteriaDetail: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  retakeBtn: {
    height: 52,
    borderRadius: borderRadius.md,
  },
  questionnaireCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  qHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  qItem: {
    marginBottom: 12,
  },
  qText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  choiceBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  choiceActive: {
    backgroundColor: '#1E2229',
    borderColor: '#1E2229',
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  choiceTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
