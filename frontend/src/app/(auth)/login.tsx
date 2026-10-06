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
import { useAuth } from '@/features/auth/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [role, setRole] = useState<'donor' | 'recipient'>('donor');
  const [email, setEmail] = useState('kasun@example.com');
  const [password, setPassword] = useState('123456');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password, role);
      router.replace('/profile');
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Please check your email and password.');
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

        {/* Fast Quick PIN Login Button */}
        <AppButton
          title="Sign In with Quick PIN"
          variant="outline"
          icon="keypad-outline"
          onPress={() => router.push('/(auth)/verify-otp')}
          style={styles.pinBtn}
        />

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
  pinBtn: {
    height: 52,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
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
});
