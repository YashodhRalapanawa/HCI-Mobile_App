import mongoose, { type Document, type Model, Schema } from 'mongoose';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type UserRole = 'donor' | 'recipient' | 'admin';
export type Gender = 'Male' | 'Female' | 'Other' | 'Prefer not to say';

export interface EmergencyContact {
  _id?: string;
  name: string;
  relationship: string;
  phone: string;
  shareLocation: boolean;
}

export interface DonationRecord {
  _id?: string;
  hospital: string;
  reference: string;
  bloodGroup: BloodGroup;
  unitsDonated: number;
  completedAt: Date;
  status: 'Completed' | 'Verified' | 'Pending';
}

export interface DonorBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
}

export interface UserPreferences {
  pushNotifications: boolean;
  smsAlerts: boolean;
  emergencyNotifications: boolean;
  donorRequestNotifications: boolean;
  campaignNotifications: boolean;
  locationSharing: boolean;
  isPublicDonor: boolean;
  language: 'en' | 'si' | 'ta';
}

export interface UserDocument extends Document {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  bloodGroup: BloodGroup;
  dateOfBirth?: Date;
  gender?: Gender;
  weight?: number;
  district: string;
  city?: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  isAvailable: boolean;
  isEligible: boolean;
  donationCount: number;
  lastDonationDate?: Date;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  role: UserRole;
  quickPin?: string;
  biometricsEnabled: boolean;
  emergencyContacts: EmergencyContact[];
  donationHistory: DonationRecord[];
  badges: DonorBadge[];
  preferences: UserPreferences;
  pushTokens: string[];
  otpCode?: string;
  otpExpiresAt?: Date;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const emergencyContactSchema = new Schema<EmergencyContact>(
  {
    name: { type: String, required: true, trim: true },
    relationship: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    shareLocation: { type: Boolean, default: true },
  },
  { _id: true },
);

const donationRecordSchema = new Schema<DonationRecord>(
  {
    hospital: { type: String, required: true, trim: true },
    reference: { type: String, required: true, trim: true },
    bloodGroup: {
      type: String,
      required: true,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    unitsDonated: { type: Number, default: 1 },
    completedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['Completed', 'Verified', 'Pending'],
      default: 'Completed',
    },
  },
  { _id: true },
);

const badgeSchema = new Schema<DonorBadge>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    phone: { type: String, trim: true },
    bloodGroup: {
      type: String,
      required: true,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      default: 'O+',
    },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
      default: 'Male',
    },
    weight: { type: Number, default: 65 },
    district: { type: String, default: 'Colombo' },
    city: { type: String, default: 'Colombo 07' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [79.8612, 6.9271] },
    },
    isAvailable: { type: Boolean, default: true },
    isEligible: { type: Boolean, default: true },
    donationCount: { type: Number, default: 0 },
    lastDonationDate: { type: Date },
    isPhoneVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ['donor', 'recipient', 'admin'],
      default: 'donor',
    },
    quickPin: { type: String },
    biometricsEnabled: { type: Boolean, default: false },
    emergencyContacts: { type: [emergencyContactSchema], default: [] },
    donationHistory: { type: [donationRecordSchema], default: [] },
    badges: { type: [badgeSchema], default: [] },
    preferences: {
      pushNotifications: { type: Boolean, default: true },
      smsAlerts: { type: Boolean, default: true },
      emergencyNotifications: { type: Boolean, default: true },
      donorRequestNotifications: { type: Boolean, default: true },
      campaignNotifications: { type: Boolean, default: true },
      locationSharing: { type: Boolean, default: true },
      isPublicDonor: { type: Boolean, default: true },
      language: { type: String, enum: ['en', 'si', 'ta'], default: 'en' },
    },
    pushTokens: { type: [String], default: [] },
    otpCode: { type: String },
    otpExpiresAt: { type: Date },
    avatarUrl: { type: String, default: '' },
  },
  { timestamps: true },
);

userSchema.index({ location: '2dsphere' });

export const User: Model<UserDocument> =
  mongoose.models.User || mongoose.model<UserDocument>('User', userSchema);
