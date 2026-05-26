import type { FastifyInstance } from 'fastify';
import { prisma } from '@/shared/db';
import { authenticate } from '@/shared/middleware/authenticate';
import { createApiKeyRepository } from './api-keys.repository';
import { createApiKeyService } from './api-keys.service';
import { createApiKeyController } from './api-keys.controller';

export function apiKeyRoutes(app: FastifyInstance): void {
  const controller = createApiKeyController(createApiKeyService(createApiKeyRepository(prisma)));

  // All API-key management requires an interactive session (JWT).
  app.addHook('preHandler', authenticate);

  app.post('/api-keys', controller.create);
  app.get('/api-keys', controller.list);
  app.delete('/api-keys/:id', controller.revoke);
}
