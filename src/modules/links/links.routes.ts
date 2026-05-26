import type { FastifyInstance } from 'fastify';
import { prisma } from '@/shared/db';
import { redis } from '@/shared/cache/redis';
import { createCacheService } from '@/shared/cache/cache.service';
import { authenticate, requireScope } from '@/shared/middleware/authenticate';
import { createLinksRepository } from './links.repository';
import { createLinksService } from './links.service';
import { createLinksController } from './links.controller';

export function linkRoutes(app: FastifyInstance): void {
  const service = createLinksService(createLinksRepository(prisma), createCacheService(redis));
  const controller = createLinksController(service);

  app.addHook('preHandler', authenticate);

  app.post('/links', { preHandler: requireScope('write') }, controller.create);
  app.get('/links', { preHandler: requireScope('read') }, controller.list);
  app.patch('/links/:id', { preHandler: requireScope('write') }, controller.update);
  app.delete('/links/:id', { preHandler: requireScope('write') }, controller.remove);
}
