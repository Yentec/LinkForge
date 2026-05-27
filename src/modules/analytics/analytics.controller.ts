import type { FastifyReply, FastifyRequest } from 'fastify';
import { getAuth } from '@/shared/middleware/authenticate';
import type { AnalyticsService } from './analytics.service';
import { statsParamsSchema, statsQuerySchema } from './analytics.schemas';

export function createAnalyticsController(service: AnalyticsService) {
  return {
    stats: async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = getAuth(request);
      const { id } = statsParamsSchema.parse(request.params);
      const query = statsQuerySchema.parse(request.query);
      return reply.send(await service.getStats(userId, id, query));
    },
  };
}
