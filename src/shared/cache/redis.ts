import { Redis } from 'ioredis';
import { env } from '@/config/env';

// maxRetriesPerRequest: null is required for reuse with BullMQ (added on Day 4).
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
