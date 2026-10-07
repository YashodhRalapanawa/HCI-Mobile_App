import { Alert, Linking, Platform } from 'react-native';

/**
 * Initiates a real native phone call using the device's dialer via 'tel:' URI scheme.
 * - On Mobile (Android / iOS): Opens the native Phone Dialer app with the donor/hospital number pre-filled.
 * - On Web: Triggers the operating system's telephone protocol (e.g. Phone Link, FaceTime, Skype).
 */
export async function makePhoneCall(phoneNumber: string, contactName?: string): Promise<void> {
  if (!phoneNumber || !phoneNumber.trim()) {
    Alert.alert('Phone Unavailable', 'No phone number is available for this contact.');
    return;
  }

  // Strip spaces, parentheses, hyphens; keep + and digits
  const cleanNumber = phoneNumber.trim().replace(/[^0-9+]/g, '');
  const telUrl = `tel:${cleanNumber}`;

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
    } catch (_) {
      Alert.alert(
        'Call Failed',
        `Could not launch phone dialer. Please dial ${contactName ? contactName + ' at ' : ''}${phoneNumber} directly.`,
      );
    }
  }
}
