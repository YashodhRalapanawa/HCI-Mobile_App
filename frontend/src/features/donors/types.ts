export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';
export type AlertType = 'emergency' | 'donor_request' | 'accepted' | 'campaign';

export interface SavedSearch {
  _id: string;
  bloodGroup: BloodGroup;
  radiusKm: number;
  eligibleOnly: boolean;
  availableNow: boolean;
}
export interface Donor {
  id?: string;
  name: string;
  avatarInitials: string;
  distanceKm: number;
  bloodGroup: BloodGroup;
  eligible: boolean;
  available: boolean;
  lastDonation: string | null;
}
export interface DonorRequest { id: string; donorId: string; status: string; }
export interface NotificationItem {
  _id: string;
  type: AlertType;
  title: string;
  details: string;
  read: boolean;
  createdAt: string;
  relatedRequestId?: string;
}
export interface ChatMessage { _id: string; senderId: string; text: string; createdAt: string; }
