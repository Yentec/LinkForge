import { config } from 'dotenv';
import { z } from 'zod';

// Loads .env if present. Never overrides variables already set (tests, CI, prod).
config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  BASE_URL: z.url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),

  JWT_SECRET: z.string().min(32),
  IP_HASH_SALT: z.string().min(16),

  // Default link lifetime in days when the client provides no expiresAt.
  // 0 disables the default (links never expire). Set to e.g. 7 in production.
  LINK_DEFAULT_TTL_DAYS: z.coerce.number().int().min(0).default(0),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(z.flattenError(parsed.error).fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
