import { z } from 'zod';

export const campaignIdSchema = z.object({ id: z.string().trim().min(1) });
export const upcomingQuerySchema = z.object({ upcoming: z.enum(['true', 'false']).default('true') });
export const registrationSchema = z.object({ userId: z.string().trim().min(1).optional() });

export const campaignSeedSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.string(),
  venue: z.string().min(1),
  location: z.object({ type: z.literal('Point'), coordinates: z.tuple([z.number(), z.number()]) }),
  date: z.coerce.date(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  organizer: z.string().min(1),
  capacity: z.number().int().positive(),
  registeredCount: z.number().int().min(0),
});
