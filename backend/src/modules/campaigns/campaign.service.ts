import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Campaign } from './campaign.model.js';
import { CampaignRegistration } from './campaign-registration.model.js';

export class CampaignServiceError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message);
  }
}

function serializeCampaign(campaign: {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  imageUrl: string;
  venue: string;
  location: { type: 'Point'; coordinates: [number, number] };
  date: Date;
  startTime: string;
  endTime: string;
  organizer: string;
  capacity: number;
  registeredCount: number;
}) {
  return {
    id: campaign._id.toString(),
    title: campaign.title,
    description: campaign.description,
    imageUrl: campaign.imageUrl,
    venue: campaign.venue,
    location: campaign.location,
    date: campaign.date.toISOString(),
    startTime: campaign.startTime,
    endTime: campaign.endTime,
    organizer: campaign.organizer,
    capacity: campaign.capacity,
    registeredCount: campaign.registeredCount,
    spotsRemaining: Math.max(campaign.capacity - campaign.registeredCount, 0),
  };
}

export async function listCampaigns(upcoming: boolean) {
  const campaigns = await Campaign.find(upcoming ? { date: { $gte: new Date() } } : {}).sort({
    date: 1,
    startTime: 1,
  });
  return campaigns.map(serializeCampaign);
}

export async function getCampaign(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new CampaignServiceError('INVALID_CAMPAIGN_ID', 'Invalid campaign id.', 400);
  const campaign = await Campaign.findById(id);
  if (!campaign) throw new CampaignServiceError('CAMPAIGN_NOT_FOUND', 'Campaign was not found.', 404);
  return serializeCampaign(campaign);
}

export async function registerForCampaign(campaignId: string, userId?: string) {
  if (!mongoose.isValidObjectId(campaignId)) throw new CampaignServiceError('INVALID_CAMPAIGN_ID', 'Invalid campaign id.', 400);
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new CampaignServiceError('CAMPAIGN_NOT_FOUND', 'Campaign was not found.', 404);
  if (campaign.registeredCount >= campaign.capacity) throw new CampaignServiceError('CAMPAIGN_FULL', 'This campaign is already full.', 400);
  const normalizedUserId = userId && mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : undefined;
  const existing = await CampaignRegistration.findOne({
    campaignId: campaign._id,
    ...(normalizedUserId ? { userId: normalizedUserId } : { userId: { $exists: false } }),
  });
  if (existing) throw new CampaignServiceError('ALREADY_REGISTERED', 'You are already registered for this campaign.', 409);
  const referenceNo = `LL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  try {
    await CampaignRegistration.create({ campaignId: campaign._id, userId: normalizedUserId, referenceNo });
    await Campaign.updateOne({ _id: campaign._id }, { $inc: { registeredCount: 1 } });
    return { referenceNo };
  } catch (cause) {
    console.error('[campaigns] Registration persistence error:', cause);
    throw new CampaignServiceError('REGISTRATION_FAILED', 'Could not register for this campaign.', 500);
  }
}

export async function cancelRegistration(campaignId: string, userId?: string) {
  if (!mongoose.isValidObjectId(campaignId)) throw new CampaignServiceError('INVALID_CAMPAIGN_ID', 'Invalid campaign id.', 400);
  const registration = await CampaignRegistration.findOneAndDelete({
    campaignId,
    ...(userId && mongoose.isValidObjectId(userId) ? { userId } : { userId: { $exists: false } }),
  });
  if (!registration) throw new CampaignServiceError('REGISTRATION_NOT_FOUND', 'Registration was not found.', 404);
  await Campaign.updateOne({ _id: campaignId, registeredCount: { $gt: 0 } }, { $inc: { registeredCount: -1 } });
}
