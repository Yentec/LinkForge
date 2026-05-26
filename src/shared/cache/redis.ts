import { Redis } from 'ioredis';
import { env } from '@/config/env';

// maxRetriesPerRequest: null is required for reuse with BullMQ (added on Day 4).
// lazyConnect: only opens a socket on first command, so importing this module is side-effect-free.
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});
