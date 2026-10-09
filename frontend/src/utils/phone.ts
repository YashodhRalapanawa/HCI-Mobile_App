import { Alert, Linking, Platform } from 'react-native';
import {
  buildSmsUrl,
  buildTelUrl,
  sanitizePhoneNumber,
  type PhoneActionResult,
} from './phoneSanitizer';

export {
  buildSmsUrl,
  buildTelUrl,
  sanitizePhoneNumber,
  type PhoneActionResult,
};

/**
 * Opens device phone dialer with pre-filled number via 'tel:' URI scheme.
 * - Does not automatically place a call.
 * - If isPreview is true, executes preview feedback instead of real dialer.
 */
export async function openPhoneDialer(
  phoneNumber: string,
  options?: {
    isPreview?: boolean;
    onPreviewFeedback?: (msg: string) => void;
  },
): Promise<PhoneActionResult> {
  const telUrl = buildTelUrl(phoneNumber);
  if (!telUrl) {
    return {
      success: false,
      action: 'call',
      error: 'Invalid or missing telephone number.',
    };
  }

  if (options?.isPreview) {
    options.onPreviewFeedback?.(
      `[Sample Preview] Phone dialer action simulated for ${phoneNumber}. In live mode, this opens your device's dialer without auto-calling.`,
    );
    return { success: true, action: 'call' };
  }

  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.location.href = telUrl;
      }
      return { success: true, action: 'call' };
    }

    const supported = await Linking.canOpenURL(telUrl);
    if (supported) {
      await Linking.openURL(telUrl);
      return { success: true, action: 'call' };
    } else {
      return {
        success: false,
        action: 'call',
        unsupported: true,
        error: `Phone dialer is not supported on this device. Contact: ${phoneNumber}`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      action: 'call',
      error: error?.message || 'Could not launch device dialer.',
    };
  }
}

/**
 * Opens device SMS composer with pre-filled recipient via 'sms:' URI scheme.
 * - Leaves body empty to avoid including patient health information.
 * - Does not automatically send messages.
 * - If isPreview is true, executes preview feedback instead of real SMS composer.
 */
export async function openSmsComposer(
  phoneNumber: string,
  options?: {
    isPreview?: boolean;
    onPreviewFeedback?: (msg: string) => void;
  },
): Promise<PhoneActionResult> {
  const smsUrl = buildSmsUrl(phoneNumber);
  if (!smsUrl) {
    return {
      success: false,
      action: 'sms',
      error: 'Invalid or missing telephone number.',
    };
  }

  if (options?.isPreview) {
    options.onPreviewFeedback?.(
      `[Sample Preview] SMS composer action simulated for ${phoneNumber}. In live mode, this opens your device's SMS app with an empty message.`,
    );
    return { success: true, action: 'sms' };
  }

  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.location.href = smsUrl;
      }
      return { success: true, action: 'sms' };
    }

    const supported = await Linking.canOpenURL(smsUrl);
    if (supported) {
      await Linking.openURL(smsUrl);
      return { success: true, action: 'sms' };
    } else {
      return {
        success: false,
        action: 'sms',
        unsupported: true,
        error: `SMS messaging is not supported on this device. Contact: ${phoneNumber}`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      action: 'sms',
      error: error?.message || 'Could not launch SMS app.',
    };
  }
}

/**
 * Copies a string to clipboard safely across platforms.
 */
export async function copyPhoneNumber(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Backward compatible legacy helper for other screens.
 */
export async function makePhoneCall(phoneNumber: string, contactName?: string): Promise<void> {
  if (!phoneNumber || !phoneNumber.trim()) {
    Alert.alert('Phone Unavailable', 'No phone number is available for this contact.');
    return;
  }

  const telUrl = buildTelUrl(phoneNumber);
  if (!telUrl) {
    Alert.alert('Invalid Number', 'The phone number format is invalid.');
    return;
  }

  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.location.href = telUrl;
      }
      return;
    }

    const supported = await Linking.canOpenURL(telUrl);
    if (supported) {
      await Linking.openURL(telUrl);
    } else {
      Alert.alert(
        'Dialer Not Supported',
        `Phone calling is not supported on this device or simulator. Contact number: ${phoneNumber}`,
        [{ text: 'OK' }],
      );
    }
  } catch (error) {
    console.warn('Error launching phone dialer:', error);
    try {
      await Linking.openURL(telUrl);
    } catch {
      Alert.alert(
        'Call Failed',
        `Could not launch phone dialer. Please dial ${contactName ? contactName + ' at ' : ''}${phoneNumber} directly.`,
      );
    }
  }
}
