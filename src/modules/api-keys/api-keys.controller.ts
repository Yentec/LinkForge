import type { FastifyReply, FastifyRequest } from 'fastify';
import { getAuth } from '@/shared/middleware/authenticate';
import type { ApiKeyService } from './api-keys.service';
import { apiKeyIdParamsSchema, createApiKeySchema } from './api-keys.schemas';

export function createApiKeyController(service: ApiKeyService) {
  return {
    create: async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = getAuth(request);
      const { name, scopes } = createApiKeySchema.parse(request.body);
      return reply.status(201).send(await service.create(userId, name, scopes));
    },

    list: async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = getAuth(request);
      return reply.send(await service.list(userId));
    },

    revoke: async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = getAuth(request);
      const { id } = apiKeyIdParamsSchema.parse(request.params);
      await service.revoke(userId, id);
      return reply.status(204).send();
    },
  };
}
