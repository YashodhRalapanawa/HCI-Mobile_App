import type { Request, Response } from 'express';
import { isDatabaseConnected } from '../../config/database.js';
import { campaignIdSchema, registrationSchema, upcomingQuerySchema } from './campaign.schema.js';
import { cancelRegistration, CampaignServiceError, getCampaign, listCampaigns, registerForCampaign } from './campaign.service.js';

function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}
function database(res: Response): boolean {
  if (isDatabaseConnected()) return true;
  sendError(res, 503, 'DATABASE_UNAVAILABLE', 'Campaigns are temporarily unavailable because the database is not connected.');
  return false;
}
function serviceError(res: Response, cause: unknown): void {
  if (cause instanceof CampaignServiceError) return sendError(res, cause.status, cause.code, cause.message);
  console.error('[campaigns] Request error:', cause);
  sendError(res, 500, 'CAMPAIGN_REQUEST_FAILED', 'The campaign request could not be completed.');
}

export async function listCampaignsController(req: Request, res: Response): Promise<void> {
  if (!database(res)) return;
  const parsed = upcomingQuerySchema.safeParse(req.query);
  if (!parsed.success) return sendError(res, 400, 'INVALID_QUERY', 'upcoming must be true or false.');
  try {
    res.json({ campaigns: await listCampaigns(parsed.data.upcoming === 'true') });
  } catch (cause) {
    serviceError(res, cause);
  }
}
export async function getCampaignController(req: Request, res: Response): Promise<void> {
  if (!database(res)) return;
  const parsed = campaignIdSchema.safeParse(req.params);
  if (!parsed.success) return sendError(res, 400, 'INVALID_CAMPAIGN_ID', 'Invalid campaign id.');
  try {
    res.json({ campaign: await getCampaign(parsed.data.id) });
  } catch (cause) {
    serviceError(res, cause);
  }
}
export async function registerController(req: Request, res: Response): Promise<void> {
  if (!database(res)) return;
  const params = campaignIdSchema.safeParse(req.params);
  const body = registrationSchema.safeParse(req.body);
  if (!params.success || !body.success) return sendError(res, 400, 'INVALID_REGISTRATION', 'Invalid campaign registration.');
  try {
    res.status(201).json(await registerForCampaign(params.data.id, body.data.userId));
  } catch (cause) {
    serviceError(res, cause);
  }
}
export async function cancelRegistrationController(req: Request, res: Response): Promise<void> {
  if (!database(res)) return;
  const params = campaignIdSchema.safeParse(req.params);
  const body = registrationSchema.safeParse(req.body ?? {});
  if (!params.success || !body.success) return sendError(res, 400, 'INVALID_REGISTRATION', 'Invalid campaign registration.');
  try {
    await cancelRegistration(params.data.id, body.data.userId);
    res.status(204).send();
  } catch (cause) {
    serviceError(res, cause);
  }
}
