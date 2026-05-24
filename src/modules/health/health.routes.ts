import type { FastifyInstance } from 'fastify';
import { checkDbConnection } from '@/shared/db';
import { redis } from '@/shared/cache/redis';

export function healthRoutes(app: FastifyInstance): void {
  // Liveness: process is up. No external dependencies checked.
  app.get('/health', () => ({ status: 'ok', uptime: process.uptime() }));

  // Readiness: dependencies reachable. Used by orchestrators before routing traffic.
  app.get('/ready', async (_request, reply) => {
    const checks = { database: false, redis: false };

    try {
      await checkDbConnection();
      checks.database = true;
    } catch {
      checks.database = false;
    }

    try {
      checks.redis = (await redis.ping()) === 'PONG';
    } catch {
      checks.redis = false;
    }

    const ready = checks.database && checks.redis;
    return reply.status(ready ? 200 : 503).send({ status: ready ? 'ready' : 'not_ready', checks });
  });
}
