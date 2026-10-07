export const SRI_LANKA_DISTRICTS = [
  'Colombo',
  'Gampaha',
  'Kalutara',
  'Kandy',
  'Matale',
  'Nuwara Eliya',
  'Galle',
  'Matara',
  'Hambantota',
  'Jaffna',
  'Kilinochchi',
  'Mannar',
  'Vavuniya',
  'Mullaitivu',
  'Batticaloa',
  'Ampara',
  'Trincomalee',
  'Kurunegala',
  'Puttalam',
  'Anuradhapura',
  'Polonnaruwa',
  'Badulla',
  'Monaragala',
  'Ratnapura',
  'Kegalle',
] as const;

export type SriLankaDistrict = (typeof SRI_LANKA_DISTRICTS)[number];

/**
 * Validates Email address format.
 * Must include '@' and a valid domain name (e.g., user@domain.com)
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Email address eka fill karanna oné.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      error: "Email eke '@' saha valid domain ekak thiyenna oné (eg: user@gmail.com).",
    };
  }
  return { isValid: true };
}

/**
 * Validates Sri Lankan mobile phone number.
 * Must be 10 digits starting with 0 (e.g. 0771234567) or +94 with 9 digits (e.g. +94771234567)
 */
export function validatePhone(phone: string): { isValid: boolean; error?: string } {
  const trimmed = phone.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Phone number eka fill karanna oné.' };
  }
  const digitsOnly = trimmed.replace(/\D/g, '');
  const isTenDigits = digitsOnly.length === 10 && digitsOnly.startsWith('0');
  const isElevenWithCountryCode = digitsOnly.length === 11 && digitsOnly.startsWith('94');

  if (!isTenDigits && !isElevenWithCountryCode) {
    return {
      isValid: false,
      error: 'Phone number ekata hariyatama digits 10k thiyenna oné (eg: 0771234567).',
    };
  }
  return { isValid: true };
}

/**
 * Validates password strength (minimum 6 characters).
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 6) {
    return {
      isValid: false,
      error: 'Password ekata aduma tharamin characters 6k thiyenna oné.',
    };
  }
  return { isValid: true };
}

/**
 * Validates Name (minimum 2 characters).
 */
export function validateName(name: string): { isValid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) {
    return {
      isValid: false,
      error: 'Nama sadaha aduma tharamin akuru 2k thiyenna oné.',
    };
  }
  return { isValid: true };
}

/**
 * Validates District against official 25 Sri Lankan Districts.
 */
export function validateDistrict(district: string): { isValid: boolean; error?: string } {
  const trimmed = district.trim();
  if (!trimmed || !SRI_LANKA_DISTRICTS.includes(trimmed as SriLankaDistrict)) {
    return {
      isValid: false,
      error: 'Sri Lankawe valid district ekak select karanna oné.',
    };
  }
  return { isValid: true };
}

/**
 * Validates City / Area (minimum 2 characters).
 */
export function validateCity(city: string): { isValid: boolean; error?: string } {
  const trimmed = city.trim();
  if (!trimmed || trimmed.length < 2) {
    return {
      isValid: false,
      error: 'City / Area eka hariyata athul karanna oné (eg: Colombo 07, Nugegoda).',
    };
  }
  return { isValid: true };
}
