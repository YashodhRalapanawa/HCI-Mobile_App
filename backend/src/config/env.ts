import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment schema. Values are read once at startup and validated.
 * MONGODB_URI is optional so the API can boot for scaffold testing
 * without a database; /api/ready reports 503 in that case.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine(
      (value) => value === undefined || /^mongodb(\+srv)?:\/\//.test(value),
      'MONGODB_URI must start with mongodb:// or mongodb+srv://',
    ),
  JWT_SECRET: z.string().default('lifeline_lk_super_secure_jwt_secret_key_2026_dev'),
  EXPO_ACCESS_TOKEN: z.string().trim().optional(),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Only field names and messages are printed — never the raw values.
  console.error('[env] Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  process.exit(1);
}

export const env: Env = parsed.data;
