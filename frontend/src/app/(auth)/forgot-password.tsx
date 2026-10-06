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
import { colors, spacing, borderRadius, shadows } from '@/theme';
import { AppHeader } from '@/components/AppHeader';
import { AppTextInput } from '@/components/AppTextInput';
import { AppButton } from '@/components/AppButton';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { authApi } from '@/features/auth/services/authApi';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [receivedCode, setReceivedCode] = useState<string | null>(null);

  // 1. Step 1: Request Reset Code from Backend
  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your registered email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.forgotPassword(email.trim());
      setCodeSent(true);
      const generatedCode = res.code || '7412';
      setReceivedCode(generatedCode);
      setCode(generatedCode);
      Alert.alert(
        'Reset Code Dispatched',
        `A password recovery code (${generatedCode}) has been dispatched to ${email.trim()}.`,
      );
    } catch (err: any) {
      Alert.alert(
        'Account Not Found',
        err.message || 'No account was found with this email. Please check your spelling.',
      );
    } finally {
      setLoading(false);
    }
  };

  // 2. Step 2: Submit New Password & Reset in MongoDB Atlas
  const handleReset = async () => {
    if (!code || !newPassword) {
      Alert.alert('Missing Fields', 'Please enter the reset code and your new password.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setLoading(true);
      await authApi.resetPassword({ email: email.trim(), code, newPassword });
      Alert.alert(
        'Password Reset Successful!',
        'Your password has been successfully updated in the LifeLine LK database. Please log in with your new password.',
        [
          {
            text: 'Sign In Now',
            onPress: () => router.push('/(auth)/login'),
          },
        ],
      );
    } catch (err: any) {
      Alert.alert(
        'Reset Failed',
        err.message || 'Invalid or expired reset code. Please request a new code.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader
        title="Reset Password"
        onBack={() => router.push('/(auth)/login')}
        rightElement={<ScreenSwitcher currentScreenId={5} />}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Real-world Email Notification Banner */}
        {receivedCode ? (
          <TouchableOpacity
            style={styles.emailBanner}
            onPress={() => setCode(receivedCode)}
            activeOpacity={0.85}
          >
            <View style={styles.emailIconCircle}>
              <Ionicons name="mail" size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.emailHeaderRow}>
                <Text style={styles.emailSender}>SECURITY EMAIL · LifeLine LK</Text>
                <Text style={styles.emailTime}>Just now</Text>
              </View>
              <Text style={styles.emailBody}>
                Your password reset code is <Text style={styles.emailCodeBold}>{receivedCode}</Text>. Valid for 15 mins.
              </Text>
            </View>
            <View style={styles.autoFillBtn}>
              <Text style={styles.autoFillText}>1-Tap Fill</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        <View style={styles.iconCircle}>
          <Ionicons name="key-outline" size={36} color="#FFFFFF" />
        </View>

        <Text style={styles.heading}>
          {codeSent ? 'Enter New Password' : 'Forgot Password?'}
        </Text>
        <Text style={styles.subheading}>
          {codeSent
            ? 'Enter the 4-digit code sent to your email and your new secure password.'
            : 'Enter your registered email address to receive password reset instructions and security code.'}
        </Text>

        <AppTextInput
          label="Registered Email"
          required
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          placeholder="e.g. nethsara@lifeline.lk"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!codeSent}
        />

        {codeSent ? (
          <>
            <AppTextInput
              label="Reset Code (4 Digits)"
              required
              icon="shield-outline"
              value={code}
              onChangeText={setCode}
              placeholder="e.g. 7412"
              keyboardType="number-pad"
            />

            <AppTextInput
              label="New Password"
              required
              icon="lock-closed-outline"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="At least 6 characters"
              secureTextEntry
            />

            <AppTextInput
              label="Confirm New Password"
              required
              icon="lock-closed-outline"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter your new password"
              secureTextEntry
            />

            <AppButton
              title="Set New Password"
              variant="primary"
              loading={loading}
              onPress={handleReset}
              style={styles.actionBtn}
            />

            <TouchableOpacity
              onPress={() => {
                setCodeSent(false);
                setReceivedCode(null);
              }}
              style={styles.resendLink}
            >
              <Text style={styles.resendText}>Use different email address</Text>
            </TouchableOpacity>
          </>
        ) : (
          <AppButton
            title="Send Reset Code"
            variant="primary"
            loading={loading}
            onPress={handleSendCode}
            style={styles.actionBtn}
          />
        )}

        <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.backLink}>
          <Ionicons name="arrow-back" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.backText}>Return to Sign In</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: 40,
  },
  emailBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: 10,
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  emailIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  emailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  emailSender: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  emailTime: {
    fontSize: 10,
    color: colors.textMuted,
  },
  emailBody: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  emailCodeBold: {
    fontWeight: '900',
    color: colors.primaryDark,
    fontSize: 14,
  },
  autoFillBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginLeft: 8,
  },
  autoFillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadows.primary,
  },
  heading: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  subheading: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  actionBtn: {
    width: '100%',
    height: 52,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  resendLink: {
    marginTop: 12,
    paddingVertical: 6,
  },
  resendText: {
    fontSize: 13,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
