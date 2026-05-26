import type { FastifyReply, FastifyRequest } from 'fastify';
import { getAuth } from '@/shared/middleware/authenticate';
import { getIdempotencyKey } from '@/shared/middleware/idempotency';
import type { LinksService } from './links.service';
import {
  createLinkSchema,
  linkIdParamsSchema,
  listLinksQuerySchema,
  updateLinkSchema,
} from './links.schemas';

export function createLinksController(service: LinksService) {
  return {
    create: async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = getAuth(request);
      const input = createLinkSchema.parse(request.body);
      const link = await service.create({
        userId,
        input,
        idempotencyKey: getIdempotencyKey(request),
      });
      return reply.status(201).send(link);
    },

    list: async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = getAuth(request);
      const { cursor, limit } = listLinksQuerySchema.parse(request.query);
      return reply.send(await service.list(userId, limit, cursor));
    },

    update: async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = getAuth(request);
      const { id } = linkIdParamsSchema.parse(request.params);
      const input = updateLinkSchema.parse(request.body);
      return reply.send(await service.update(userId, id, input));
    },

    remove: async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = getAuth(request);
      const { id } = linkIdParamsSchema.parse(request.params);
      await service.remove(userId, id);
      return reply.status(204).send();
    },
  };
}
