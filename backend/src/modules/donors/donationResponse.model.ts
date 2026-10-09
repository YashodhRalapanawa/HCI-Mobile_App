import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export type DonationResponseStatus = 'accepted';

/**
 * DonationResponse represents a blood donor expressing their willingness to donate
 * in response to an admin-published hospital/blood bank DonationRequest.
 *
 * CRITICAL ARCHITECTURAL DISTINCTION:
 * - This model references admin-published `DonationRequest` records and the responding donor `User`.
 * - It is strictly separate from the legacy `DonorAcceptance` model, which referenced patient `BloodRequest` records.
 * - This record represents willingness only: it does NOT assign delivery, confirm arrival,
 *   decrement units, mark medical completion, or reserve an appointment.
 */
export interface DonationResponseDocument extends Document {
  donationRequestId: Types.ObjectId;
  donorId: Types.ObjectId;
  status: DonationResponseStatus;
  acceptedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const donationResponseSchema = new Schema<DonationResponseDocument>(
  {
    donationRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'DonationRequest',
      required: true,
      index: true,
    },
    donorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['accepted'],
      default: 'accepted',
      required: true,
    },
    acceptedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { timestamps: true },
);

// Enforce compound uniqueness so one donor can only submit one response per donation request
donationResponseSchema.index({ donationRequestId: 1, donorId: 1 }, { unique: true });

// Optimize donor-specific historical queries sorted by acceptance timestamp descending
donationResponseSchema.index({ donorId: 1, acceptedAt: -1, _id: -1 });

export const DonationResponse: Model<DonationResponseDocument> =
  mongoose.models.DonationResponse ||
  mongoose.model<DonationResponseDocument>('DonationResponse', donationResponseSchema);
