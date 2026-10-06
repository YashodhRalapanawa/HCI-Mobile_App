import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { AppHeader } from '@/components/AppHeader';
import { AppTextInput } from '@/components/AppTextInput';
import { AppButton } from '@/components/AppButton';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { useAuth } from '@/features/auth/context/AuthContext';

export default function CompleteProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { register } = useAuth();

  const [isAvailable, setIsAvailable] = useState(true);
  const [hasRecentDonation, setHasRecentDonation] = useState(false);
  const [healthyToday, setHealthyToday] = useState(true);
  const [noChronicCondition, setNoChronicCondition] = useState(true);

  // Emergency contact fields
  const [contactName, setContactName] = useState('Sanduni Silva');
  const [contactPhone, setContactPhone] = useState('+94 71 987 6543');
  const [contactRel, setContactRel] = useState('Spouse');

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await register({
        name: params.name,
        email: params.email,
        password: params.password,
        role: params.role || 'donor',
        bloodGroup: params.bloodGroup || 'O+',
        phone: params.phone || '+94 77 123 4567',
        district: params.district || 'Colombo',
        city: params.city || 'Colombo 07',
        dateOfBirth: params.dateOfBirth || '1998-05-15',
        gender: params.gender || 'Male',
        weight: Number(params.weight) || 65,
        isAvailable,
        emergencyContact: {
          name: contactName,
          phone: contactPhone,
          relationship: contactRel,
        },
      });

      Alert.alert(
        'Profile Created!',
        'Your blood donor profile is ready. Let us verify your phone number.',
        [
          {
            text: 'Verify Phone',
            onPress: () => router.push('/(auth)/verify-otp'),
          },
        ],
      );
    } catch (err: any) {
      Alert.alert('Registration Notice', err.message || 'Continuing to verification...', [
        {
          text: 'Continue',
          onPress: () => router.push('/(auth)/verify-otp'),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader
        title="Complete Profile"
        onBack={() => router.back()}
        rightElement={<ScreenSwitcher currentScreenId={8} />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Step Indicator */}
        <View style={styles.stepContainer}>
          <Text style={styles.stepText}>Step 3 of 3: Readiness & Safety</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
        </View>

        {/* Availability Toggle Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="radio-button-on" size={20} color={isAvailable ? colors.success : colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Available to Donate Now</Text>
              <Text style={styles.cardSub}>
                Allow recipients and blood banks to see your active donor readiness.
              </Text>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={setIsAvailable}
              trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
              thumbColor={isAvailable ? colors.success : '#F3F4F6'}
            />
          </View>
        </View>

        {/* Health Pre-check Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Basic Health Pre-Check</Text>

          <TouchableOpacity
            style={styles.checkItem}
            onPress={() => setHealthyToday(!healthyToday)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, healthyToday && styles.checkboxActive]}>
              {healthyToday && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkText}>I am feeling healthy and energetic today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkItem}
            onPress={() => setNoChronicCondition(!noChronicCondition)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, noChronicCondition && styles.checkboxActive]}>
              {noChronicCondition && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkText}>No recent fever, infection, or major dental work</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkItem}
            onPress={() => setHasRecentDonation(!hasRecentDonation)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, hasRecentDonation && styles.checkboxActive]}>
              {hasRecentDonation && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkText}>I have NOT donated blood in the past 90 days</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Primary Emergency Contact</Text>
          <AppTextInput
            label="Contact Person Name"
            icon="person-outline"
            value={contactName}
            onChangeText={setContactName}
            placeholder="e.g. Sanduni Silva"
          />

          <View style={styles.twoCol}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <AppTextInput
                label="Relationship"
                icon="people-outline"
                value={contactRel}
                onChangeText={setContactRel}
                placeholder="Spouse / Parent"
              />
            </View>
            <View style={{ flex: 1.2 }}>
              <AppTextInput
                label="Phone Number"
                icon="call-outline"
                value={contactPhone}
                onChangeText={setContactPhone}
                placeholder="+94 71 987 6543"
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <AppButton
          title="Complete & Create Profile"
          variant="primary"
          loading={loading}
          icon="checkmark-circle-outline"
          onPress={handleSubmit}
          style={styles.submitBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 40,
  },
  stepContainer: {
    marginBottom: spacing.md,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    borderWidth: 1.2,
    borderColor: '#E5E7EB',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  cardSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
    paddingRight: 8,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  twoCol: {
    flexDirection: 'row',
  },
  submitBtn: {
    height: 54,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
});
