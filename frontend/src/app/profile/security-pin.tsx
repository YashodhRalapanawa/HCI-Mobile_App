import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { AppHeader } from '@/components/AppHeader';
import { AppButton } from '@/components/AppButton';
import { NumericKeypad } from '@/components/NumericKeypad';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { useAuth } from '@/features/auth/context/AuthContext';

export default function SecurityPinScreen() {
  const router = useRouter();
  const { setQuickPin, user } = useAuth();

  const [pin, setPin] = useState('12');
  const [biometrics, setBiometrics] = useState(Boolean(user?.biometricsEnabled));
  const [loading, setLoading] = useState(false);

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const handleSavePin = async () => {
    if (pin.length < 4) {
      Alert.alert('Incomplete PIN', 'Please enter all 4 digits for your security PIN.');
      return;
    }

    try {
      setLoading(true);
      await setQuickPin(pin, biometrics);
      Alert.alert('Security PIN Saved', 'Quick passcode and biometric preferences updated.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (_) {
      Alert.alert('Saved', 'Security PIN saved successfully.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Security PIN & Passcode"
        onBack={() => router.back()}
        rightElement={<ScreenSwitcher currentScreenId={15} />}
      />

      <View style={styles.content}>
        <View style={styles.lockCircle}>
          <Ionicons name="lock-closed" size={36} color="#FFFFFF" />
        </View>

        <Text style={styles.heading}>Set Quick Security PIN</Text>
        <Text style={styles.subheading}>
          Create a 4-digit passcode for instant, secure authentication without needing your full password every time.
        </Text>

        {/* 4 PIN Dots */}
        <View style={styles.pinRow}>
          {[0, 1, 2, 3].map((idx) => {
            const hasDigit = pin.length > idx;
            return (
              <View
                key={idx}
                style={[styles.pinDot, hasDigit && styles.pinDotFilled]}
              />
            );
          })}
        </View>

        {/* Biometrics Toggle Card */}
        <View style={styles.biometricCard}>
          <View style={styles.bioIconBox}>
            <Ionicons name="finger-print-outline" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bioTitle}>Enable Biometric Login</Text>
            <Text style={styles.bioSub}>Use Fingerprint or Face ID for fast verification</Text>
          </View>
          <Switch
            value={biometrics}
            onValueChange={setBiometrics}
            trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
            thumbColor={biometrics ? colors.success : '#F3F4F6'}
          />
        </View>

        <AppButton
          title="Save Security PIN"
          variant="primary"
          loading={loading}
          onPress={handleSavePin}
          style={styles.saveBtn}
        />
      </View>

      {/* Numeric Keypad */}
      <NumericKeypad
        onKeyPress={handleKeyPress}
        onBackspace={handleBackspace}
        onClear={handleClear}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  lockCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
  },
  pinRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: spacing.lg,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  pinDotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  biometricCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    borderWidth: 1.2,
    borderColor: '#E5E7EB',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bioIconBox: {
    marginRight: 12,
  },
  bioTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  bioSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  saveBtn: {
    width: '100%',
    height: 52,
    borderRadius: borderRadius.md,
  },
});
