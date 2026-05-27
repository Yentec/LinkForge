import { Redis } from 'ioredis';
import { env } from '@/config/env';

/**
 * Dedicated Redis connection for BullMQ. Workers issue blocking commands, so they
 * must not share the app's command connection. maxRetriesPerRequest: null is
 * required by BullMQ.
 */
export function createQueueConnection(): Redis {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
}
