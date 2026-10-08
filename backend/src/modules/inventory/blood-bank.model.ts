import mongoose, { type Document, type Model, Schema } from 'mongoose';

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];
export type StockStatus = 'high' | 'medium' | 'low' | 'out';

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface StockEntry {
  bloodGroup: BloodGroup;
  units: number;
}

export interface BloodBankDocument extends Document {
  name: string;
  address: string;
  district: string;
  location: GeoPoint;
  phone: string;
  email: string;
  openHours: string;
  stock: StockEntry[];
  updatedAt: Date;
  isOpenNow: boolean;
}

export function getStockStatus(units: number): StockStatus {
  if (units >= 20) return 'high';
  if (units >= 8) return 'medium';
  if (units >= 1) return 'low';
  return 'out';
}

const stockSchema = new Schema<StockEntry>(
  {
    bloodGroup: { type: String, required: true, enum: BLOOD_GROUPS },
    units: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const bloodBankSchema = new Schema<BloodBankDocument>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (value: number[]) => value.length === 2,
          message: 'Location must contain longitude and latitude.',
        },
      },
    },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    openHours: { type: String, required: true, trim: true },
    stock: { type: [stockSchema], default: [] },
  },
  { timestamps: true },
);

bloodBankSchema.index({ location: '2dsphere' });
bloodBankSchema.virtual('isOpenNow').get(function isOpenNow(this: BloodBankDocument): boolean {
  const match = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(this.openHours);
  if (!match) return false;
  const [, startHour, startMinute, endHour, endMinute] = match;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const start = Number(startHour) * 60 + Number(startMinute);
  const end = Number(endHour) * 60 + Number(endMinute);
  return currentMinutes >= start && currentMinutes <= end;
});
bloodBankSchema.set('toJSON', { virtuals: true });

export const BloodBank: Model<BloodBankDocument> =
  mongoose.models.BloodBank || mongoose.model<BloodBankDocument>('BloodBank', bloodBankSchema);
