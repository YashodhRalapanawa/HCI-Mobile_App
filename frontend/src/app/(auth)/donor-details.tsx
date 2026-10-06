import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, borderRadius } from '@/theme';
import { AppHeader } from '@/components/AppHeader';
import { AppTextInput } from '@/components/AppTextInput';
import { AppButton } from '@/components/AppButton';
import { BloodGroupSelector } from '@/components/BloodGroupSelector';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';

const DISTRICTS = [
  'Colombo',
  'Gampaha',
  'Kalutara',
  'Kandy',
  'Galle',
  'Matara',
  'Kurunegala',
  'Anuradhapura',
  'Jaffna',
  'Badulla',
];

export default function DonorDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [bloodGroup, setBloodGroup] = useState('O+');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [dateOfBirth, setDateOfBirth] = useState('1998-05-15');
  const [weight, setWeight] = useState('65');
  const [district, setDistrict] = useState('Colombo');
  const [city, setCity] = useState('Colombo 07');

  const handleNext = () => {
    router.push({
      pathname: '/(auth)/complete-profile',
      params: {
        ...params,
        bloodGroup,
        gender,
        dateOfBirth,
        weight,
        district,
        city,
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader
        title="Donor Details"
        onBack={() => router.back()}
        rightElement={<ScreenSwitcher currentScreenId={7} />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Step Indicator */}
        <View style={styles.stepContainer}>
          <Text style={styles.stepText}>Step 2 of 3: Medical & Location</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '66%' }]} />
          </View>
        </View>

        {/* Blood Group Selector (Figma Wireframe Pills) */}
        <BloodGroupSelector
          selectedGroup={bloodGroup}
          onSelect={setBloodGroup}
          label="Select Blood Group"
        />

        {/* Gender Selector */}
        <View style={styles.fieldSection}>
          <Text style={styles.sectionLabel}>Gender</Text>
          <View style={styles.genderRow}>
            {(['Male', 'Female', 'Other'] as const).map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.genderBtn, gender === item && styles.genderBtnActive]}
                onPress={() => setGender(item)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.genderText, gender === item && styles.genderTextActive]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date of Birth & Weight */}
        <View style={styles.twoColumn}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <AppTextInput
              label="Date of Birth"
              required
              icon="calendar-outline"
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder="YYYY-MM-DD"
            />
          </View>
          <View style={{ width: 110 }}>
            <AppTextInput
              label="Weight (kg)"
              required
              icon="fitness-outline"
              value={weight}
              onChangeText={setWeight}
              placeholder="65"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* District Selector */}
        <View style={styles.fieldSection}>
          <Text style={styles.sectionLabel}>District *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.districtScroll}>
            {DISTRICTS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.districtChip, district === d && styles.districtChipActive]}
                onPress={() => setDistrict(d)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.districtText, district === d && styles.districtTextActive]}
                >
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <AppTextInput
          label="City / Area"
          required
          icon="location-outline"
          value={city}
          onChangeText={setCity}
          placeholder="e.g. Colombo 07, Kollupitiya"
        />

        {/* Continue to Step 3 */}
        <AppButton
          title="Continue to Health Check (Step 3)"
          variant="primary"
          icon="arrow-forward"
          onPress={handleNext}
          style={styles.continueBtn}
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
  fieldSection: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    height: 46,
    borderRadius: borderRadius.sm,
    borderWidth: 1.2,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  genderTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  twoColumn: {
    flexDirection: 'row',
  },
  districtScroll: {
    flexDirection: 'row',
  },
  districtChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: borderRadius.full,
    borderWidth: 1.2,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  districtChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  districtText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  districtTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  continueBtn: {
    height: 54,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
});
