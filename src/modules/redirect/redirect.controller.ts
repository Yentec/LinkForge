import type { FastifyReply, FastifyRequest } from 'fastify';
import { enqueueClick } from '@/modules/tracking/tracking.queue';
import type { RedirectService } from './redirect.service';
import { redirectParamsSchema } from './redirect.schemas';

export function createRedirectController(service: RedirectService) {
  return {
    redirect: async (request: FastifyRequest, reply: FastifyReply) => {
      const { code } = redirectParamsSchema.parse(request.params);
      const link = await service.resolve(code);

      // Fire-and-forget: tracking must never block or fail the redirect.
      void enqueueClick({
        linkId: link.id,
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? '',
        referrer: request.headers.referer ?? null,
      });

      // Fastify 5 signature: redirect(url, code?).
      return reply.redirect(link.target, 302);
    },
  };
}
