import { z } from 'zod';

export const susResponseSchema = z.object({
  userId: z.string().trim().min(1).optional(),
  question: z.string().trim().min(1).max(500),
  score: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
  agreeStatement: z.enum(['agree', 'disagree']).optional(),
});
