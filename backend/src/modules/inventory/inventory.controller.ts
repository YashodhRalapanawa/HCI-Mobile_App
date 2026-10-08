import type { Request, Response } from 'express';
import { isDatabaseConnected } from '../../config/database.js';
import { BLOOD_GROUPS } from './blood-bank.model.js';
import { InventoryServiceError, getBank, getSummary, listBanks } from './inventory.service.js';
import { inventoryIdSchema, inventoryQuerySchema } from './inventory.schema.js';

function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}

function requireDatabase(res: Response): boolean {
  if (isDatabaseConnected()) return true;
  sendError(res, 503, 'DATABASE_UNAVAILABLE', 'Blood inventory is temporarily unavailable because the database is not connected.');
  return false;
}

export async function listBanksController(req: Request, res: Response): Promise<void> {
  if (!requireDatabase(res)) return;
  const parsed = inventoryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    sendError(res, 400, 'INVALID_QUERY', 'Invalid inventory filters.');
    return;
  }
  try {
    res.json({ banks: await listBanks(parsed.data) });
  } catch (error) {
    console.error('[inventory] List error:', error);
    sendError(res, 500, 'INVENTORY_FETCH_FAILED', 'Failed to fetch blood banks.');
  }
}

export async function getBankController(req: Request, res: Response): Promise<void> {
  if (!requireDatabase(res)) return;
  const parsed = inventoryIdSchema.safeParse(req.params);
  if (!parsed.success) {
    sendError(res, 400, 'INVALID_ID', 'Invalid blood bank id.');
    return;
  }
  try {
    res.json({ bank: await getBank(parsed.data.id) });
  } catch (error) {
    if (error instanceof InventoryServiceError) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    console.error('[inventory] Detail error:', error);
    sendError(res, 500, 'INVENTORY_FETCH_FAILED', 'Failed to fetch blood bank.');
  }
}

export async function summaryController(req: Request, res: Response): Promise<void> {
  if (!requireDatabase(res)) return;
  const parsed = inventoryQuerySchema.pick({ bloodGroup: true, lat: true, lng: true }).safeParse(req.query);
  if (!parsed.success) {
    sendError(res, 400, 'INVALID_QUERY', `Blood group must be one of ${BLOOD_GROUPS.join(', ')}.`);
    return;
  }
  try {
    res.json(await getSummary(parsed.data.bloodGroup, parsed.data.lat, parsed.data.lng));
  } catch (error) {
    console.error('[inventory] Summary error:', error);
    sendError(res, 500, 'INVENTORY_SUMMARY_FAILED', 'Failed to fetch inventory summary.');
  }
}
