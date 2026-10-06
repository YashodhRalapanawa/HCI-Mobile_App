import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { AppTextInput } from '@/components/AppTextInput';
import { AppButton } from '@/components/AppButton';
import { RoleTabs } from '@/components/RoleTabs';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';

export default function RegisterScreen() {
  const router = useRouter();

  const [role, setRole] = useState<'donor' | 'recipient'>('donor');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  const handleNext = () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Missing Fields', 'Full name, email address, and password are required.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match. Please recheck.');
      return;
    }

    if (!agreeTerms) {
      Alert.alert('Terms Required', 'Please accept the privacy terms to continue.');
      return;
    }

    // Pass data along to Step 2 (Donor Details)
    router.push({
      pathname: '/(auth)/donor-details',
      params: {
        role,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || '+94 77 123 4567',
        password,
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader
        title="Register Account"
        onBack={() => router.push('/(auth)/login')}
        rightElement={<ScreenSwitcher currentScreenId={6} />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Step Indicator */}
        <View style={styles.stepContainer}>
          <Text style={styles.stepText}>Step 1 of 3: Account Information</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '33%' }]} />
          </View>
        </View>

        {/* Role Tabs */}
        <RoleTabs selectedRole={role} onSelectRole={setRole} />

        {/* Inputs */}
        <AppTextInput
          label="Full Name"
          required
          icon="person-outline"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Kasun Silva"
          autoCapitalize="words"
        />

        <AppTextInput
          label="Email Address"
          required
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          placeholder="e.g. kasun@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <AppTextInput
          label="Mobile Phone Number"
          required
          icon="call-outline"
          value={phone}
          onChangeText={setPhone}
          placeholder="+94 77 123 4567"
          keyboardType="phone-pad"
        />

        <AppTextInput
          label="Password"
          required
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          secureTextEntry
        />

        <AppTextInput
          label="Confirm Password"
          required
          icon="lock-closed-outline"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter your password"
          secureTextEntry
        />

        {/* Agree Terms Checkbox */}
        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => setAgreeTerms(!agreeTerms)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
            {agreeTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </View>
          <Text style={styles.termsText}>
            I agree to the <Text style={styles.termsBold}>Terms of Service</Text> and{' '}
            <Text style={styles.termsBold}>Donor Privacy Policy</Text>.
          </Text>
        </TouchableOpacity>

        {/* Continue Button */}
        <AppButton
          title="Continue to Step 2"
          variant="primary"
          icon="arrow-forward"
          onPress={handleNext}
          style={styles.continueBtn}
        />

        {/* Already have an account */}
        <View style={styles.loginRow}>
          <Text style={styles.loginPrompt}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  termsBold: {
    fontWeight: '700',
    color: colors.primary,
  },
  continueBtn: {
    height: 54,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginPrompt: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
});
