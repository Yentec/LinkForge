import type { FastifyInstance } from 'fastify';
import { prisma } from '@/shared/db';
import { redis } from '@/shared/cache/redis';
import { createCacheService } from '@/shared/cache/cache.service';
import { createLinksRepository } from '@/modules/links/links.repository';
import { createRedirectService } from './redirect.service';
import { createRedirectController } from './redirect.controller';

export function redirectRoutes(app: FastifyInstance): void {
  const service = createRedirectService(createLinksRepository(prisma), createCacheService(redis));
  const controller = createRedirectController(service);

  // Public, unauthenticated, root-level. Registered last so it can't shadow /v1 or /health.
  app.get('/:code', controller.redirect);
}
