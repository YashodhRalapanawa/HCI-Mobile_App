import mongoose, { type Document, type Model, Schema } from 'mongoose';

export interface CampaignRegistrationDocument extends Document {
  campaignId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  referenceNo: string;
  createdAt: Date;
}

const registrationSchema = new Schema<CampaignRegistrationDocument>(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    referenceNo: { type: String, required: true, unique: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

registrationSchema.index({ campaignId: 1, userId: 1 }, { unique: true, sparse: true });

export const CampaignRegistration: Model<CampaignRegistrationDocument> =
  mongoose.models.CampaignRegistration ||
  mongoose.model<CampaignRegistrationDocument>('CampaignRegistration', registrationSchema);
