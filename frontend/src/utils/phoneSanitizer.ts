/**
 * Pure phone sanitization and URL construction utilities.
 * Free of React Native dependencies so it can be shared and unit-tested in Node/TS environments.
 */

/**
 * Normalizes phone number strictly to dialable telephone characters:
 * optional leading '+' followed by digits.
 * Rejects numbers with fewer than 7 digits or more than 15 digits (E.164 standard).
 * Prevents arbitrary protocol or script injection.
 */
export function sanitizePhoneNumber(phoneNumber: string | undefined | null): string | null {
  if (!phoneNumber || typeof phoneNumber !== 'string') return null;
  const trimmed = phoneNumber.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Safely constructs a validated 'tel:' URI scheme.
 * Returns null if the phone number is invalid.
 */
export function buildTelUrl(phoneNumber: string | undefined | null): string | null {
  const sanitized = sanitizePhoneNumber(phoneNumber);
  if (!sanitized) return null;
  return `tel:${sanitized}`;
}

/**
 * Safely constructs a validated 'sms:' URI scheme with an empty body
 * to prevent patient medical data leaks.
 * Returns null if the phone number is invalid.
 */
export function buildSmsUrl(phoneNumber: string | undefined | null): string | null {
  const sanitized = sanitizePhoneNumber(phoneNumber);
  if (!sanitized) return null;
  return `sms:${sanitized}`;
}

export interface PhoneActionResult {
  success: boolean;
  action: 'call' | 'sms';
  error?: string;
  unsupported?: boolean;
}
