import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export type AcceptanceStatus = 'accepted' | 'withdrawn' | 'completed';

export interface DonorAcceptanceDocument extends Document {
  requestId: Types.ObjectId;
  donorId: Types.ObjectId;
  safeDonorCode: string;
  status: AcceptanceStatus;
  createdAt: Date;
  updatedAt: Date;
}

const donorAcceptanceSchema = new Schema<DonorAcceptanceDocument>(
  {
    requestId: {
      type: Schema.Types.ObjectId,
      ref: 'BloodRequest',
      required: true,
      index: true,
    },
    donorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    safeDonorCode: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    status: {
      type: String,
      enum: ['accepted', 'withdrawn', 'completed'],
      default: 'accepted',
      index: true,
    },
  },
  { timestamps: true },
);

// Prevent duplicate active acceptance records for the same request and donor
donorAcceptanceSchema.index({ requestId: 1, donorId: 1 }, { unique: true });
// Optimize active donor queries by request
donorAcceptanceSchema.index({ requestId: 1, status: 1, createdAt: -1, _id: -1 });

export const DonorAcceptance: Model<DonorAcceptanceDocument> =
  mongoose.models.DonorAcceptance ||
  mongoose.model<DonorAcceptanceDocument>('DonorAcceptance', donorAcceptanceSchema);
