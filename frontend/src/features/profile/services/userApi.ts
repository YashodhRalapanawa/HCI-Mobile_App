import { apiRequest } from '@/services/api';
import type { UserDto } from '@/features/auth/services/authApi';

export const userApi = {
  getProfile: (token: string) =>
    apiRequest<{ user: UserDto }>('users/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  updateProfile: (token: string, payload: Partial<UserDto>) =>
    apiRequest<{ message: string; user: UserDto }>('users/me', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),

  updateAvailability: (token: string, isAvailable: boolean) =>
    apiRequest<{ message: string; isAvailable: boolean; user: UserDto }>('users/me/availability', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isAvailable }),
    }),

  toggleAvailability: (token: string, isAvailable: boolean) =>
    apiRequest<{ message: string; isAvailable: boolean; user: UserDto }>('users/me/availability', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isAvailable }),
    }),

  getEligibility: (token: string) =>
    apiRequest<{
      isEligible: boolean;
      daysSinceLastDonation: number;
      nextEligibleDate: string;
      criteria: { title: string; satisfied: boolean; note: string }[];
    }>('users/me/eligibility', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  submitEligibility: (token: string, answers: boolean[]) =>
    apiRequest<{ message: string; isEligible: boolean; user: UserDto }>('users/me/eligibility', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ answers }),
    }),

  getEmergencyContacts: (token: string) =>
    apiRequest<{
      contacts: {
        _id?: string;
        name: string;
        relationship: string;
        phone: string;
        shareLocation: boolean;
      }[];
    }>('users/me/emergency-contacts', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  addEmergencyContact: (
    token: string,
    payload: { name: string; relationship: string; phone: string; shareLocation?: boolean },
  ) =>
    apiRequest<{
      message: string;
      contacts: {
        _id?: string;
        name: string;
        relationship: string;
        phone: string;
        shareLocation: boolean;
      }[];
    }>('users/me/emergency-contacts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),

  deleteEmergencyContact: (token: string, contactId: string) =>
    apiRequest<{
      message: string;
      contacts: {
        _id?: string;
        name: string;
        relationship: string;
        phone: string;
        shareLocation: boolean;
      }[];
    }>(`users/me/emergency-contacts/${contactId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),

  getDonationHistory: (token: string) =>
    apiRequest<{
      donations: {
        _id?: string;
        hospital: string;
        reference: string;
        bloodGroup: string;
        unitsDonated: number;
        completedAt: string;
        status: string;
      }[];
      totalDonations: number;
      estimatedLivesSaved: number;
      totalVolumeLiters: string;
    }>('users/me/donation-history', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getBadges: (token: string) =>
    apiRequest<{
      badges: {
        id: string;
        title: string;
        description: string;
        icon: string;
        unlocked: boolean;
        minDonations: number;
      }[];
      currentCount: number;
      nextBadge?: {
        id: string;
        title: string;
        description: string;
        icon: string;
        unlocked: boolean;
        minDonations: number;
      } | null;
    }>('users/me/badges', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getPublicProfile: (userId: string) =>
    apiRequest<{
      donor: {
        id: string;
        name: string;
        bloodGroup: string;
        district: string;
        city: string;
        isAvailable: boolean;
        isEligible: boolean;
        donationCount: number;
        isPhoneVerified: boolean;
        badges?: { id: string; title: string; description: string; icon: string }[];
      };
    }>(`users/${userId}/public-profile`),
};
