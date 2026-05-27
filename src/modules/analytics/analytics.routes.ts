import type { FastifyInstance } from 'fastify';
import { prisma } from '@/shared/db';
import { redis } from '@/shared/cache/redis';
import { createCacheService } from '@/shared/cache/cache.service';
import { authenticate, requireScope } from '@/shared/middleware/authenticate';
import { createLinksRepository } from '@/modules/links/links.repository';
import { createAnalyticsRepository } from './analytics.repository';
import { createAnalyticsService } from './analytics.service';
import { createAnalyticsController } from './analytics.controller';

export function analyticsRoutes(app: FastifyInstance): void {
  const service = createAnalyticsService(
    createAnalyticsRepository(prisma),
    createLinksRepository(prisma),
    createCacheService(redis),
  );
  const controller = createAnalyticsController(service);

  app.addHook('preHandler', authenticate);
  app.get('/links/:id/stats', { preHandler: requireScope('read') }, controller.stats);
}
