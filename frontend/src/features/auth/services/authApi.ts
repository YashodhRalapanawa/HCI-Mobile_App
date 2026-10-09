import { apiRequest } from '@/services/api';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  phone?: string;
  bloodGroup: string;
  role: 'donor' | 'recipient' | 'admin';
  avatarUrl?: string;
  gender?: string;
  dateOfBirth?: string;
  weight?: number;
  district: string;
  city?: string;
  isAvailable: boolean;
  isEligible: boolean;
  donationCount: number;
  lastDonationDate?: string;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  hasQuickPin?: boolean;
  biometricsEnabled?: boolean;
  emergencyContacts?: {
    _id?: string;
    name: string;
    relationship: string;
    phone: string;
    shareLocation: boolean;
  }[];
  donationHistory?: {
    _id?: string;
    hospital: string;
    reference: string;
    bloodGroup: string;
    unitsDonated: number;
    completedAt: string;
    status: string;
  }[];
  badges?: {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlockedAt?: string;
  }[];
  preferences?: {
    pushNotifications: boolean;
    smsAlerts: boolean;
    locationSharing: boolean;
    isPublicDonor: boolean;
    language: 'en' | 'si' | 'ta';
  };
}

export interface AuthResponse {
  message: string;
  token: string;
  user: UserDto;
}

export const authApi = {
  register: (payload: Record<string, unknown>) =>
    apiRequest<AuthResponse>('auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string; role?: string }) =>
    apiRequest<AuthResponse>('auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  sendOtp: (target: string) =>
    apiRequest<{ message: string; otp: string; expiresAt: string }>('auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ target }),
    }),

  verifyOtp: (target: string, code: string) =>
    apiRequest<{ message: string; token?: string; user?: UserDto }>('auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ target, code }),
    }),

  forgotPassword: (email: string) =>
    apiRequest<{ message: string; code: string }>('auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (payload: { email: string; code: string; newPassword: string }) =>
    apiRequest<{ message: string }>('auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  setQuickPin: (token: string, pin: string, biometricsEnabled?: boolean) =>
    apiRequest<{ message: string; user: UserDto }>('auth/quick-pin/set', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pin, biometricsEnabled }),
    }),

  verifyQuickPin: (email: string, pin: string) =>
    apiRequest<AuthResponse>('auth/quick-pin/verify', {
      method: 'POST',
      body: JSON.stringify({ email, pin }),
    }),
};
