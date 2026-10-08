import { z } from 'zod';
import { BLOOD_GROUPS } from './blood-bank.model.js';

const coordinateSchema = z
  .tuple([z.coerce.number().min(-180).max(180), z.coerce.number().min(-90).max(90)])
  .optional();

export const inventoryQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(500).default(25),
  bloodGroup: z.enum(BLOOD_GROUPS).optional(),
  filter: z.enum(['nearest', 'open', 'high']).default('nearest'),
});

export const inventoryIdSchema = z.object({ id: z.string().trim().min(1) });

export const bloodBankSeedSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  district: z.string().min(1),
  location: z.object({ type: z.literal('Point'), coordinates: coordinateSchema }),
  phone: z.string().min(1),
  email: z.string().email(),
  openHours: z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/),
  stock: z.array(
    z.object({
      bloodGroup: z.enum(BLOOD_GROUPS),
      units: z.number().int().min(0),
    }),
  ),
});

export type InventoryQuery = z.infer<typeof inventoryQuerySchema>;
