import type { Redis } from 'ioredis';

export function createCacheService(redis: Redis) {
  return {
    async getJson<T>(key: string): Promise<T | null> {
      const raw = await redis.get(key);

      return raw ? (JSON.parse(raw) as T) : null;
    },

    async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    },

    async del(key: string): Promise<void> {
      await redis.del(key);
    },
  };
}

export type CacheService = ReturnType<typeof createCacheService>;
