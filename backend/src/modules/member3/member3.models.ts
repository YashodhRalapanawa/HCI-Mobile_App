import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type AlertType = 'emergency' | 'donor_request' | 'accepted' | 'campaign';

export interface SavedSearchDocument extends Document {
  ownerId: mongoose.Types.ObjectId;
  bloodGroup: string;
  radiusKm: number;
  eligibleOnly: boolean;
  availableNow: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DonorRequestDocument extends Document {
  requesterId: mongoose.Types.ObjectId;
  donorId: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationDocument extends Document {
  recipientId: mongoose.Types.ObjectId;
  type: AlertType;
  title: string;
  details: string;
  read: boolean;
  relatedRequestId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatDocument extends Document {
  memberIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageDocument extends Document {
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  text: string;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CallSessionDocument extends Document {
  callerId: mongoose.Types.ObjectId;
  donorId: mongoose.Types.ObjectId;
  proxyNumber: string;
  expiresAt: Date;
  status: 'active' | 'ended' | 'expired' | 'failed';
  endedAt?: Date;
  report?: {
    reason: string;
    details?: string;
    createdAt: Date;
  };
  createdAt: Date;
}

const savedSearchSchema = new Schema<SavedSearchDocument>({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'], required: true },
  radiusKm: { type: Number, min: 5, max: 20, required: true },
  eligibleOnly: { type: Boolean, default: true },
  availableNow: { type: Boolean, default: true },
}, { timestamps: true });

const requestSchema = new Schema<DonorRequestDocument>({
  requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  donorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'cancelled'], default: 'pending' },
}, { timestamps: true });
requestSchema.index({ requesterId: 1, donorId: 1, status: 1 });

const notificationSchema = new Schema<NotificationDocument>({
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['emergency', 'donor_request', 'accepted', 'campaign'], required: true },
  title: { type: String, required: true, trim: true },
  details: { type: String, required: true, trim: true },
  read: { type: Boolean, default: false },
  relatedRequestId: { type: Schema.Types.ObjectId, ref: 'DonorRequest' },
}, { timestamps: true });

const chatSchema = new Schema<ChatDocument>({
  memberIds: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
}, { timestamps: true });

const messageSchema = new Schema<MessageDocument>({
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  deliveredAt: { type: Date },
  readAt: { type: Date },
}, { timestamps: true });

const callSessionSchema = new Schema<CallSessionDocument>({
  callerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  donorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  proxyNumber: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: true },
  status: { type: String, enum: ['active', 'ended', 'expired', 'failed'], default: 'active', index: true },
  endedAt: { type: Date },
  report: {
    reason: { type: String, trim: true },
    details: { type: String, trim: true, maxlength: 1000 },
    createdAt: { type: Date },
  },
}, { timestamps: true });

export const SavedSearch = (mongoose.models.SavedSearch as Model<SavedSearchDocument> | undefined) ?? mongoose.model<SavedSearchDocument>('SavedSearch', savedSearchSchema);
export const DonorRequest = (mongoose.models.DonorRequest as Model<DonorRequestDocument> | undefined) ?? mongoose.model<DonorRequestDocument>('DonorRequest', requestSchema);
export const Notification = (mongoose.models.Notification as Model<NotificationDocument> | undefined) ?? mongoose.model<NotificationDocument>('Notification', notificationSchema);
export const Chat = (mongoose.models.Chat as Model<ChatDocument> | undefined) ?? mongoose.model<ChatDocument>('Chat', chatSchema);
export const Message = (mongoose.models.Message as Model<MessageDocument> | undefined) ?? mongoose.model<MessageDocument>('Message', messageSchema);
export const CallSession = (mongoose.models.CallSession as Model<CallSessionDocument> | undefined) ?? mongoose.model<CallSessionDocument>('CallSession', callSessionSchema);
