import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';
import type { BloodGroup } from '../users/user.model.js';

export type RequestUrgency = 'Urgent' | 'Scheduled';

export type RequestStatus =
  | 'pending_verification'
  | 'verified'
  | 'in_progress'
  | 'fulfilled'
  | 'cancelled';

export interface RequestDocumentMetadata {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
}

export interface DeliveryAssignment {
  assignmentId: string;
  deliveryPersonName: string;
  contactPhone: string;
  assignedAt: Date;
}

export interface BloodRequestDocument extends Document {
  requesterId: Types.ObjectId;
  patientName: string;
  bloodGroup: BloodGroup;
  unitsRequired: number;
  unitsFulfilled: number;
  hospitalId: string;
  hospitalName: string;
  hospitalReferenceAndWard: string;
  urgency: RequestUrgency;
  document: RequestDocumentMetadata;
  status: RequestStatus;
  deliveryAssignment?: DeliveryAssignment;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryAssignmentSchema = new Schema<DeliveryAssignment>(
  {
    assignmentId: { type: String, required: true, trim: true },
    deliveryPersonName: { type: String, required: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    assignedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const documentMetadataSchema = new Schema<RequestDocumentMetadata>(
  {
    originalName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    sizeBytes: { type: Number, required: true },
    storageKey: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const bloodRequestSchema = new Schema<BloodRequestDocument>(
  {
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    bloodGroup: {
      type: String,
      required: true,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    unitsRequired: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    unitsFulfilled: {
      type: Number,
      default: 0,
      min: 0,
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
    hospitalReferenceAndWard: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    urgency: {
      type: String,
      required: true,
      enum: ['Urgent', 'Scheduled'],
    },
    document: {
      type: documentMetadataSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending_verification', 'verified', 'in_progress', 'fulfilled', 'cancelled'],
      default: 'pending_verification',
      index: true,
    },
    deliveryAssignment: {
      type: deliveryAssignmentSchema,
      required: false,
    },
  },
  { timestamps: true },
);

bloodRequestSchema.index({ requesterId: 1, status: 1, createdAt: -1, _id: -1 });

export const BloodRequest: Model<BloodRequestDocument> =
  mongoose.models.BloodRequest ||
  mongoose.model<BloodRequestDocument>('BloodRequest', bloodRequestSchema);
