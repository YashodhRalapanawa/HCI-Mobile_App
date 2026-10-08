import mongoose, { type Document, type Model, Schema } from 'mongoose';

export interface CampaignLocation {
  type: 'Point';
  coordinates: [number, number];
}

export interface CampaignDocument extends Document {
  title: string;
  description: string;
  imageUrl: string;
  venue: string;
  location: CampaignLocation;
  date: Date;
  startTime: string;
  endTime: string;
  organizer: string;
  capacity: number;
  registeredCount: number;
}

const campaignSchema = new Schema<CampaignDocument>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: '' },
    venue: { type: String, required: true, trim: true },
    location: {
      type: { type: String, enum: ['Point'], required: true, default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    organizer: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    registeredCount: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true },
);

campaignSchema.index({ location: '2dsphere' });

export const Campaign: Model<CampaignDocument> =
  mongoose.models.Campaign || mongoose.model<CampaignDocument>('Campaign', campaignSchema);
