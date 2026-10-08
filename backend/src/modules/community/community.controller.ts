import type { Request, Response } from 'express';
import { isDatabaseConnected } from '../../config/database.js';
import { susResponseSchema } from './community.schema.js';
import { createSusResponse, getCommunityStats } from './community.service.js';

function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}
function database(res: Response): boolean {
  if (isDatabaseConnected()) return true;
  sendError(res, 503, 'DATABASE_UNAVAILABLE', 'Community feedback is temporarily unavailable because the database is not connected.');
  return false;
}
export async function createSusController(req: Request, res: Response): Promise<void> {
  if (!database(res)) return;
  const parsed = susResponseSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'INVALID_SUS_RESPONSE', 'Question, score, and optional feedback must be valid.');
  try {
    res.status(201).json({ response: await createSusResponse(parsed.data) });
  } catch (cause) {
    console.error('[community] SUS create error:', cause);
    sendError(res, 500, 'SUS_CREATE_FAILED', 'Could not save feedback.');
  }
}
export async function statsController(_req: Request, res: Response): Promise<void> {
  if (!database(res)) return;
  try {
    res.json(await getCommunityStats());
  } catch (cause) {
    console.error('[community] Stats error:', cause);
    sendError(res, 500, 'COMMUNITY_STATS_FAILED', 'Could not load community statistics.');
  }
}
