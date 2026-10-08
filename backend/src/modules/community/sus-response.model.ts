import mongoose, { type Document, type Model, Schema } from 'mongoose';

export interface SusResponseDocument extends Document {
  userId?: mongoose.Types.ObjectId;
  question: string;
  score: number;
  comment?: string;
  agreeStatement?: 'agree' | 'disagree';
  createdAt: Date;
}

const susResponseSchema = new Schema<SusResponseDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    question: { type: String, required: true, trim: true },
    score: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
    agreeStatement: { type: String, enum: ['agree', 'disagree'] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const SusResponse: Model<SusResponseDocument> =
  mongoose.models.SusResponse || mongoose.model<SusResponseDocument>('SusResponse', susResponseSchema);
