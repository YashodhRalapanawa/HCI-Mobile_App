import mongoose from 'mongoose';
import { SusResponse } from './sus-response.model.js';

export async function createSusResponse(input: {
  userId?: string;
  question: string;
  score: number;
  comment?: string;
  agreeStatement?: 'agree' | 'disagree';
}) {
  const response = await SusResponse.create({
    ...input,
    userId: input.userId && mongoose.isValidObjectId(input.userId) ? input.userId : undefined,
  });
  return { id: response._id.toString(), createdAt: response.createdAt.toISOString() };
}

export async function getCommunityStats() {
  const [activeMembers, aggregate] = await Promise.all([
    SusResponse.distinct('userId', { userId: { $exists: true, $ne: null } }),
    SusResponse.aggregate<{ averageScore: number; totalResponses: number }>([
      { $group: { _id: null, averageScore: { $avg: '$score' }, totalResponses: { $sum: 1 } } },
    ]),
  ]);
  const values = aggregate[0];
  return {
    activeMembers: activeMembers.length,
    averageScore: values ? Number(values.averageScore.toFixed(2)) : 0,
    totalResponses: values?.totalResponses ?? 0,
  };
}
