import { Router, type Response } from 'express';
import { createHmac } from 'node:crypto';
import mongoose from 'mongoose';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { User, type UserDocument } from '../users/user.model.js';
import { CallSession, Chat, DonorRequest, Message, Notification, SavedSearch } from './member3.models.js';

export const member3Router = Router();
member3Router.use(authenticate);
const idOf = (req: AuthenticatedRequest) => new mongoose.Types.ObjectId(req.user!._id.toString());
const validGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const donorKey = (id: string) => createHmac('sha256', 'lifeline-member3-donor-key').update(id).digest('hex').slice(0, 24);
const compatibleDonorGroups: Record<string, string[]> = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': validGroups,
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'],
};

interface GeoDonor {
  _id: mongoose.Types.ObjectId;
  name: string;
  bloodGroup: UserDocument['bloodGroup'];
  isAvailable: boolean;
  isEligible: boolean;
  lastDonationDate?: Date;
  distanceMeters: number;
}

function donorDto(user: Pick<UserDocument, '_id' | 'name' | 'bloodGroup' | 'isAvailable' | 'lastDonationDate'>, distanceKm: number, eligible: boolean) {
  return {
    id: donorKey(user._id.toString()),
    name: user.name,
    avatarInitials: user.name.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase(),
    distanceKm: Number(distanceKm.toFixed(1)),
    bloodGroup: user.bloodGroup,
    eligible,
    available: user.isAvailable,
    lastDonation: user.lastDonationDate?.toISOString() ?? null,
  };
}

member3Router.get('/donors/search', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const bloodGroup = String(req.query.bloodGroup ?? '');
  const radiusKm = Number(req.query.radiusKm ?? 10);
  if (!validGroups.includes(bloodGroup) || !Number.isFinite(radiusKm) || radiusKm < 5 || radiusKm > 20) {
    res.status(400).json({ message: 'Valid bloodGroup and radiusKm between 5 and 20 are required.' });
    return;
  }
  const eligibleOnly = req.query.eligibleOnly === 'true';
  const availableNow = req.query.availableNow === 'true';
  const requester = await User.findById(idOf(req)).select('bloodGroup location').lean<UserDocument>();
  const coordinates = requester?.location?.coordinates;
  if (!coordinates || coordinates.length !== 2 || coordinates.some((value) => !Number.isFinite(value))) {
    res.status(400).json({ message: 'Your location is required before searching for donors.' });
    return;
  }
  const users = await User.aggregate<GeoDonor>([
    {
      $geoNear: {
        near: { type: 'Point', coordinates },
        key: 'location',
        distanceField: 'distanceMeters',
        maxDistance: radiusKm * 1000,
        spherical: true,
        query: {
          _id: { $ne: idOf(req) },
          role: 'donor',
          bloodGroup: { $in: compatibleDonorGroups[bloodGroup] },
          ...(availableNow ? { isAvailable: true } : {}),
        },
      },
    },
    { $limit: 100 },
  ]);
  const now = Date.now();
  const donors = users.map((user) => {
    const eligible = !user.lastDonationDate || now - user.lastDonationDate.getTime() >= 90 * 86400000;
    return { user, eligible, distanceKm: user.distanceMeters / 1000 };
  }).filter((item) => item.distanceKm <= radiusKm && (!eligibleOnly || item.eligible))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .map((item) => donorDto(item.user, item.distanceKm, item.eligible));
  res.json({ donors });
});

member3Router.get('/saved-searches', async (req: AuthenticatedRequest, res: Response) => {
  res.json({ searches: await SavedSearch.find({ ownerId: idOf(req) }).sort({ updatedAt: -1 }).lean() });
});
member3Router.post('/saved-searches', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { bloodGroup, radiusKm, eligibleOnly = true, availableNow = true, notifyWhenAvailable = false } = req.body;
  if (!validGroups.includes(bloodGroup) || !Number.isFinite(Number(radiusKm)) || Number(radiusKm) < 5 || Number(radiusKm) > 20
    || typeof eligibleOnly !== 'boolean' || typeof availableNow !== 'boolean' || typeof notifyWhenAvailable !== 'boolean') {
    res.status(400).json({ message: 'Invalid saved search.' }); return;
  }
  res.status(201).json({ search: await SavedSearch.create({ ownerId: idOf(req), bloodGroup, radiusKm: Number(radiusKm), eligibleOnly, availableNow, notifyWhenAvailable }) });
});
member3Router.put('/saved-searches/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const allowed = ['bloodGroup', 'radiusKm', 'eligibleOnly', 'availableNow', 'notifyWhenAvailable'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  if ('bloodGroup' in updates && !validGroups.includes(updates.bloodGroup as string)) {
    res.status(400).json({ message: 'Invalid blood group.' }); return;
  }
  if ('radiusKm' in updates && (!Number.isFinite(Number(updates.radiusKm)) || Number(updates.radiusKm) < 5 || Number(updates.radiusKm) > 20)) {
    res.status(400).json({ message: 'Invalid radius.' }); return;
  }
  if (['eligibleOnly', 'availableNow', 'notifyWhenAvailable'].some((key) => key in updates && typeof updates[key] !== 'boolean')) {
    res.status(400).json({ message: 'Search options must be boolean.' }); return;
  }
  if ('radiusKm' in updates) updates.radiusKm = Number(updates.radiusKm);
  const search = await SavedSearch.findOneAndUpdate({ _id: req.params.id, ownerId: idOf(req) }, updates, { new: true, runValidators: true });
  if (!search) { res.status(404).json({ message: 'Saved search not found.' }); return; }
  res.json({ search });
});
member3Router.delete('/saved-searches/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await SavedSearch.deleteOne({ _id: req.params.id, ownerId: idOf(req) }); res.status(204).send();
});

member3Router.get('/requests', async (req: AuthenticatedRequest, res: Response) => {
  const requests = await DonorRequest.find({ requesterId: idOf(req), status: 'pending' }).lean();
  res.json({ requests: requests.map((request) => ({ id: request._id.toString(), donorId: request.donorId.toString(), status: request.status })) });
});
member3Router.post('/requests', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const donorKeyValue = String(req.body.donorId ?? '');
  const donor = (await User.find({ role: 'donor' })).find((candidate) => donorKey(candidate._id.toString()) === donorKeyValue);
  if (!donor || donor._id.toString() === idOf(req).toString()) { res.status(400).json({ message: 'Valid donor is required.' }); return; }
  const donorId = donor._id.toString();
  const exists = await DonorRequest.findOne({ requesterId: idOf(req), donorId, status: 'pending' });
  if (exists) { res.status(409).json({ message: 'A pending request already exists.' }); return; }
  const request = await DonorRequest.create({ requesterId: idOf(req), donorId });
  await Notification.create({ recipientId: donor._id, type: 'donor_request', title: 'New donor request', details: 'A recipient requested your help.', relatedRequestId: request._id });
  // TODO: enqueue FCM push notification; target delivery is under 10 seconds.
  res.status(201).json({ request: { id: request._id.toString(), donorId, status: request.status } });
});
member3Router.delete('/requests/:donorId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await DonorRequest.updateOne({ requesterId: idOf(req), donorId: req.params.donorId, status: 'pending' }, { status: 'cancelled' });
  await Notification.deleteMany({ recipientId: req.params.donorId, type: 'donor_request', relatedRequestId: { $exists: true } });
  res.status(204).send();
});

member3Router.get('/notifications', async (req: AuthenticatedRequest, res: Response) => res.json({ notifications: await Notification.find({ recipientId: idOf(req) }).sort({ createdAt: -1 }).lean() }));
member3Router.patch('/notifications/:id/read', async (req: AuthenticatedRequest, res: Response): Promise<void> => { const notification = await Notification.findOneAndUpdate({ _id: req.params.id, recipientId: idOf(req) }, { read: true }, { new: true }); if (!notification) { res.status(404).json({ message: 'Notification not found.' }); return; } res.json({ notification }); });
member3Router.patch('/notifications/read-all', async (req: AuthenticatedRequest, res: Response) => { await Notification.updateMany({ recipientId: idOf(req), read: false }, { read: true }); res.json({ message: 'All notifications marked as read.' }); });
member3Router.post('/notifications/:id/respond', async (req: AuthenticatedRequest, res: Response): Promise<void> => { const { response } = req.body; if (response !== 'accepted' && response !== 'declined') { res.status(400).json({ message: 'Response must be accepted or declined.' }); return; } const notification = await Notification.findOneAndUpdate({ _id: req.params.id, recipientId: idOf(req) }, { read: true }, { new: true }); if (!notification) { res.status(404).json({ message: 'Notification not found.' }); return; } if (notification.relatedRequestId) await DonorRequest.findByIdAndUpdate(notification.relatedRequestId, { status: response }); res.json({ notification }); });
member3Router.delete('/notifications/:id', async (req: AuthenticatedRequest, res: Response) => { await Notification.deleteOne({ _id: req.params.id, recipientId: idOf(req) }); res.status(204).send(); });

member3Router.post('/chats', async (req: AuthenticatedRequest, res: Response): Promise<void> => { const donorKeyValue = String(req.body.donorId ?? ''); const donor = (await User.find({ role: 'donor' })).find((candidate) => donorKey(candidate._id.toString()) === donorKeyValue); if (!donor) { res.status(400).json({ message: 'Valid donor is required.' }); return; } const donorId = donor._id; let chat = await Chat.findOne({ memberIds: { $all: [idOf(req), donorId], $size: 2 } }); if (!chat) chat = await Chat.create({ memberIds: [idOf(req), donorId] }); res.json({ chat: { id: chat._id.toString(), donorId: donorKeyValue } }); });
member3Router.get('/chats/:id/messages', async (req: AuthenticatedRequest, res: Response): Promise<void> => { const chat = await Chat.findOne({ _id: req.params.id, memberIds: idOf(req) }); if (!chat) { res.status(403).json({ message: 'Chat access denied.' }); return; } res.json({ messages: await Message.find({ chatId: chat._id }).sort({ createdAt: 1 }).lean() }); });
member3Router.post('/chats/:id/messages', async (req: AuthenticatedRequest, res: Response): Promise<void> => { const text = String(req.body.text ?? '').trim(); const chat = await Chat.findOne({ _id: req.params.id, memberIds: idOf(req) }); if (!chat || !text || text.length > 1000) { res.status(400).json({ message: 'Chat and message text are required.' }); return; } res.status(201).json({ message: await Message.create({ chatId: chat._id, senderId: idOf(req), text, deliveredAt: new Date() }) }); });
member3Router.patch('/chats/:id/messages/:mid/read', async (req: AuthenticatedRequest, res: Response): Promise<void> => { const chat = await Chat.findOne({ _id: req.params.id, memberIds: idOf(req) }); if (!chat) { res.status(403).json({ message: 'Chat access denied.' }); return; } const message = await Message.findOneAndUpdate({ _id: req.params.mid, chatId: chat._id, senderId: { $ne: idOf(req) } }, { readAt: new Date(), deliveredAt: new Date() }, { new: true }); if (!message) { res.status(404).json({ message: 'Message not found.' }); return; } res.json({ message }); });
member3Router.patch('/chats/:id/messages/:mid', async (req: AuthenticatedRequest, res: Response): Promise<void> => { const text = String(req.body.text ?? '').trim(); const message = await Message.findOneAndUpdate({ _id: req.params.mid, chatId: req.params.id, senderId: idOf(req) }, { text }, { new: true, runValidators: true }); if (!message) { res.status(404).json({ message: 'Message not found.' }); return; } res.json({ message }); });
member3Router.delete('/chats/:id/messages/:mid', async (req: AuthenticatedRequest, res: Response) => { await Message.deleteOne({ _id: req.params.mid, chatId: req.params.id, senderId: idOf(req) }); res.status(204).send(); });

member3Router.get('/notification-preferences', async (req: AuthenticatedRequest, res: Response) => res.json({ preferences: req.user!.preferences }));
member3Router.patch('/notification-preferences', async (req: AuthenticatedRequest, res: Response): Promise<void> => { const allowed = ['pushNotifications', 'smsAlerts', 'emergencyNotifications', 'donorRequestNotifications', 'campaignNotifications'] as const; const update = Object.fromEntries(allowed.filter((key) => typeof req.body[key] === 'boolean').map((key) => [`preferences.${key}`, req.body[key]])); if (!Object.keys(update).length) { res.status(400).json({ message: 'At least one notification preference is required.' }); return; } const user = await User.findByIdAndUpdate(idOf(req), { $set: update }, { new: true }).select('preferences').lean(); res.json({ preferences: user?.preferences }); });

member3Router.post('/calls/start', async (req: AuthenticatedRequest, res: Response): Promise<void> => { const donorKeyValue = String(req.body.donorId ?? ''); const donor = (await User.find({ role: 'donor' })).find((candidate) => donorKey(candidate._id.toString()) === donorKeyValue); if (!donor) { res.status(400).json({ message: 'Valid donor is required.' }); return; } const expiresAt = new Date(Date.now() + 15 * 60 * 1000); const call = await CallSession.create({ callerId: idOf(req), donorId: donor._id, proxyNumber: '+94110000000', expiresAt, status: 'active' }); res.status(201).json({ callId: call._id.toString(), proxyNumber: call.proxyNumber, expiresAt, status: call.status }); });
member3Router.get('/calls/history', async (req: AuthenticatedRequest, res: Response) => { const calls = await CallSession.find({ callerId: idOf(req) }).sort({ createdAt: -1 }).limit(50).lean(); res.json({ calls }); });
member3Router.post('/calls/:id/end', async (req: AuthenticatedRequest, res: Response): Promise<void> => { const call = await CallSession.findOneAndUpdate({ _id: req.params.id, callerId: idOf(req), status: 'active' }, { status: 'ended', endedAt: new Date() }, { new: true }); if (!call) { res.status(404).json({ message: 'Active call not found.' }); return; } res.json({ call }); });
member3Router.post('/calls/:id/report', async (req: AuthenticatedRequest, res: Response): Promise<void> => { const reason = String(req.body.reason ?? '').trim(); const details = String(req.body.details ?? '').trim(); if (!reason || reason.length > 120 || details.length > 1000) { res.status(400).json({ message: 'A valid reason is required.' }); return; } const call = await CallSession.findOneAndUpdate({ _id: req.params.id, callerId: idOf(req) }, { report: { reason, details, createdAt: new Date() }, status: 'failed', endedAt: new Date() }, { new: true }); if (!call) { res.status(404).json({ message: 'Call session not found.' }); return; } res.status(201).json({ call }); });
