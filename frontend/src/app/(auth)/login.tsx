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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { AppHeader } from '@/components/AppHeader';
import { AppTextInput } from '@/components/AppTextInput';
import { AppButton } from '@/components/AppButton';
import { RoleTabs } from '@/components/RoleTabs';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { useAuth } from '@/features/auth/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; returnTo?: string }>();
  const { login } = useAuth();

  const [role, setRole] = useState<'donor' | 'recipient'>('donor');
  const [email, setEmail] = useState(params.email ? String(params.email) : 'kasun@example.com');
  const [password, setPassword] = useState('123456');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoginError(null);
    const trimmedInput = email.trim();
    if (!trimmedInput) {
      setLoginError('Karunakara email address eka ho mobile number eka athul karanna.');
      return;
    }

    // Check if email or phone
    if (trimmedInput.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedInput)) {
        setLoginError("Email eke '@' saha valid domain ekak thiyenna oné (eg: user@gmail.com).");
        return;
      }
    } else {
      const digitsOnly = trimmedInput.replace(/\D/g, '');
      if (digitsOnly.length !== 10 && digitsOnly.length !== 11) {
        setLoginError('Phone number ekata hariyatama digits 10k thiyenna oné (eg: 0771234567).');
        return;
      }
    }

    if (!password || password.length < 6) {
      setLoginError('Password ekata aduma tharamin characters 6k thiyenna oné.');
      return;
    }

    try {
      setLoading(true);
      const loggedUser = await login(trimmedInput, password, role);
      if (params.returnTo) {
        router.replace(params.returnTo as any);
      } else if (loggedUser.role === 'donor') {
        router.replace('/donor/dashboard' as any);
      } else {
        router.replace('/dashboard' as any);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const gUser = await login('google.donor@lifeline.lk', '123456', role);
      if (gUser.role === 'donor') {
        router.replace('/donor/dashboard' as any);
      } else {
        router.replace('/dashboard' as any);
      }
    } catch (err: any) {
      Alert.alert('Google Login', err?.message || 'Google sign-in is unavailable. Please sign in with registered credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      setLoading(true);
      const fbUser = await login('facebook.donor@lifeline.lk', '123456', role);
      if (fbUser.role === 'donor') {
        router.replace('/donor/dashboard' as any);
      } else {
        router.replace('/dashboard' as any);
      }
    } catch (err: any) {
      Alert.alert('Facebook Login', err?.message || 'Facebook sign-in is unavailable. Please sign in with registered credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topBar}>
        <AppHeader
          title="Login With Us"
          onBack={() => router.push('/(auth)/onboarding')}
          rightElement={<ScreenSwitcher currentScreenId={3} />}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Role Selector Tabs */}
        <RoleTabs selectedRole={role} onSelectRole={setRole} />

        <View style={styles.welcomeSection}>
          <Text style={styles.heading}>Welcome Back</Text>
          <Text style={styles.subheading}>
            Sign in as a {role === 'donor' ? 'blood donor' : 'recipient'} to continue.
          </Text>
        </View>

        {/* Inline Error Banner */}
        {loginError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{loginError}</Text>
          </View>
        ) : null}

        {/* Input Fields */}
        <AppTextInput
          label="Email Address or Mobile"
          required
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          placeholder="e.g. kasun@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <AppTextInput
          label="Password"
          required
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
        />

        {/* Remember Me and Forgot Password */}
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setRememberMe(!rememberMe)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
              {rememberMe && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxLabel}>Remember me</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        {/* Primary Sign In Button */}
        <AppButton
          title="Sign In"
          variant="primary"
          loading={loading}
          onPress={handleLogin}
          style={styles.signInBtn}
        />

        {/* OR Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google & Facebook Social Login Buttons */}
        <View style={styles.socialButtonsContainer}>
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={handleGoogleLogin}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={19} color="#EA4335" style={{ marginRight: 10 }} />
            <Text style={styles.socialBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialBtn}
            onPress={handleFacebookLogin}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-facebook" size={20} color="#1877F2" style={{ marginRight: 10 }} />
            <Text style={styles.socialBtnText}>Continue with Facebook</Text>
          </TouchableOpacity>
        </View>

        {/* Register Account Link */}
        <View style={styles.registerSection}>
          <Text style={styles.registerPrompt}>{"Don't have an account? "}</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerLink}>Sign Up</Text>
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
  topBar: {
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 40,
  },
  welcomeSection: {
    marginBottom: spacing.lg,
  },
  heading: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.4,
  },
  subheading: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: '#1E2229',
    borderColor: '#1E2229',
  },
  checkboxLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
  signInBtn: {
    height: 54,
    borderRadius: borderRadius.md,
    marginBottom: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  socialButtonsContainer: {
    gap: 10,
    marginBottom: spacing.lg,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  socialBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerPrompt: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.2,
    borderColor: '#FCA5A5',
    borderRadius: borderRadius.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '500',
    lineHeight: 18,
  },
});
