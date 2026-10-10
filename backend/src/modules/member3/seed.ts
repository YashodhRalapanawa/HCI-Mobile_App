import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../../config/database.js';
import { env } from '../../config/env.js';
import { User, type BloodGroup, type UserDocument } from '../users/user.model.js';
import { Chat, Message, Notification } from './member3.models.js';

async function seed(): Promise<void> {
  if (!env.MONGODB_URI) throw new Error('MONGODB_URI is required to seed Member 3 demo data.');
  await connectDatabase(env.MONGODB_URI);
  const passwordHash = await bcrypt.hash('123456', 10);
  const demo = await User.findOneAndUpdate(
    { email: 'demo-user@lifeline.lk' },
    {
      name: 'Demo Recipient',
      email: 'demo-user@lifeline.lk',
      passwordHash,
      role: 'recipient',
      bloodGroup: 'O+',
      district: 'Gampaha',
      city: 'Negombo',
      location: { type: 'Point', coordinates: [79.8358, 7.2083] },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const donorSpecs: Array<{
    name: string;
    email: string;
    bloodGroup: BloodGroup;
    coordinates: [number, number];
    isAvailable: boolean;
    lastDonationDate?: Date;
  }> = [
    { name: 'Kasun Perera', email: 'kasun.member1@lifeline.lk', bloodGroup: 'O+', coordinates: [79.831, 7.206], isAvailable: true, lastDonationDate: new Date(Date.now() - 105 * 86400000) },
    { name: 'Nimal Perera', email: 'nimal.demo@lifeline.lk', bloodGroup: 'O+', coordinates: [79.837, 7.209], isAvailable: true },
    { name: 'Sanduni Silva', email: 'sanduni.demo@lifeline.lk', bloodGroup: 'O+', coordinates: [79.829, 7.212], isAvailable: true, lastDonationDate: new Date(Date.now() - 120 * 86400000) },
    { name: 'Amaya Fernando', email: 'amaya.demo@lifeline.lk', bloodGroup: 'A+', coordinates: [79.842, 7.203], isAvailable: true },
    { name: 'Kasun Jayawardena', email: 'kasun.demo@lifeline.lk', bloodGroup: 'O-', coordinates: [79.846, 7.216], isAvailable: true, lastDonationDate: new Date(Date.now() - 180 * 86400000) },
    { name: 'Madhavi Peris', email: 'madhavi.demo@lifeline.lk', bloodGroup: 'O+', coordinates: [79.818, 7.202], isAvailable: false, lastDonationDate: new Date(Date.now() - 210 * 86400000) },
    { name: 'Ravindu Fernando', email: 'ravindu.demo@lifeline.lk', bloodGroup: 'O-', coordinates: [79.854, 7.194], isAvailable: true, lastDonationDate: new Date(Date.now() - 45 * 86400000) },
    { name: 'Tharushi Silva', email: 'tharushi.demo@lifeline.lk', bloodGroup: 'O+', coordinates: [79.805, 7.225], isAvailable: true, lastDonationDate: new Date(Date.now() - 365 * 86400000) },
    { name: 'Dilan Rodrigo', email: 'dilan.demo@lifeline.lk', bloodGroup: 'B+', coordinates: [79.833, 7.215], isAvailable: true, lastDonationDate: new Date(Date.now() - 140 * 86400000) },
    { name: 'Ishara Weerasinghe', email: 'ishara.demo@lifeline.lk', bloodGroup: 'A-', coordinates: [79.824, 7.199], isAvailable: true, lastDonationDate: new Date(Date.now() - 95 * 86400000) },
    { name: 'Piumi Lakmali', email: 'piumi.demo@lifeline.lk', bloodGroup: 'AB+', coordinates: [79.841, 7.218], isAvailable: true },
    { name: 'Sahan Maduranga', email: 'sahan.demo@lifeline.lk', bloodGroup: 'O+', coordinates: [79.812, 7.211], isAvailable: false, lastDonationDate: new Date(Date.now() - 200 * 86400000) },
  ];
  const donors = await Promise.all(donorSpecs.map(({ name, email, bloodGroup, coordinates, isAvailable, lastDonationDate }) => User.findOneAndUpdate(
    { email: email as UserDocument['email'] },
    {
      name,
      email,
      passwordHash,
      role: 'donor',
      bloodGroup,
      district: 'Gampaha',
      city: 'Negombo',
      location: { type: 'Point', coordinates },
      isAvailable,
      lastDonationDate,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )));
  await Notification.deleteMany({ recipientId: demo._id });
  await Notification.create([
    { recipientId: demo._id, type: 'emergency', title: 'Urgent blood needed', details: 'O+ blood is needed at Negombo General Hospital.', read: false },
    { recipientId: demo._id, type: 'donor_request', title: 'Donor request update', details: 'Kasun Jayawardena is available to help with your request.', read: false },
    { recipientId: demo._id, type: 'accepted', title: 'Request accepted', details: 'Sanduni Silva accepted your donor request.', read: false },
    { recipientId: demo._id, type: 'campaign', title: 'Blood donation campaign', details: 'Join the Negombo community drive this weekend.', read: true },
    { recipientId: demo._id, type: 'campaign', title: 'Community donor drive', details: 'A donor awareness event starts at Negombo Town Hall on Saturday.', read: false },
    { recipientId: demo._id, type: 'emergency', title: 'Emergency request nearby', details: 'O- blood is needed at District General Hospital, Negombo.', read: true },
    { recipientId: demo._id, type: 'campaign', title: 'New matching donor found', details: 'Dilan Rodrigo, a B+ donor near Negombo, is now available for matching requests.', read: false },
  ]);
  let chat = await Chat.findOne({ memberIds: { $all: [demo._id, donors[0]!._id] } });
  if (!chat) {
    chat = await Chat.create({ memberIds: [demo._id, donors[0]!._id] });
  }
  await Message.deleteMany({ chatId: chat._id });
  await Message.create({ chatId: chat._id, senderId: donors[0]!._id, text: 'Hello, I am available to help.' });
  console.log(`[seed] Created Member 3 demo data for ${demo.email}.`);
  await disconnectDatabase();
  await mongoose.disconnect();
}

void seed().catch(async (error: unknown) => {
  console.error('[seed] Failed:', error instanceof Error ? error.message : 'unknown error');
  await disconnectDatabase();
  process.exitCode = 1;
});
