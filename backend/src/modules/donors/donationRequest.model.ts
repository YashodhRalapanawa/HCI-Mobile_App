import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';
import type { BloodGroup } from '../users/user.model.js';

export type DonationRequestPublicationStatus = 'draft' | 'published' | 'closed';
export type DonationRequestUrgency = 'Urgent' | 'Scheduled';

export interface DonationRequestDocument extends Document {
  bloodGroup: BloodGroup;
  unitsRequired: number;
  hospitalId: string;
  hospitalName: string;
  locationDescription: string;
  urgency: DonationRequestUrgency;
  neededBy?: Date | null;
  status: DonationRequestPublicationStatus;
  publishedAt?: Date | null;
  closedAt?: Date | null;
  /**
   * Meaningful internal response counter coordinating atomic concurrency
   * between donor acceptance and administrative request closure.
   */
  responseCount: number;
  /**
   * Internal reference linking this invitation to a hospital/patient BloodRequest.
   * Kept private on the server; never exposed to donor client lists.
   */
  internalRequestId?: Types.ObjectId | null;
  /**
   * Internal administrative creator ID for future admin auditing.
   */
  createdByAdminId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const donationRequestSchema = new Schema<DonationRequestDocument>(
  {
    bloodGroup: {
      type: String,
      required: true,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    unitsRequired: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    hospitalId: {
      type: String,
      required: true,
      trim: true,
    },
    hospitalName: {
      type: String,
      required: true,
      trim: true,
    },
    locationDescription: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    urgency: {
      type: String,
      required: true,
      enum: ['Urgent', 'Scheduled'],
      default: 'Urgent',
    },
    neededBy: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'published', 'closed'],
      default: 'draft', // Never published by default
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    responseCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    internalRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'BloodRequest',
      default: null,
    },
    createdByAdminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
);

// Compound index for efficient donor listing of published, non-expired requests ordered deterministically
donationRequestSchema.index({ status: 1, neededBy: 1, publishedAt: -1, _id: -1 });

export const DonationRequest: Model<DonationRequestDocument> =
  mongoose.models.DonationRequest ||
  mongoose.model<DonationRequestDocument>('DonationRequest', donationRequestSchema);
