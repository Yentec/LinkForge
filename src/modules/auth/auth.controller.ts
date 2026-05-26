import type { FastifyReply, FastifyRequest } from 'fastify';
import { getAuth } from '@/shared/middleware/authenticate';
import type { AuthService } from './auth.service';
import { loginSchema, refreshSchema, registerSchema } from './auth.schemas';

export function createAuthController(service: AuthService) {
  return {
    register: async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password } = registerSchema.parse(request.body);
      return reply.status(201).send(await service.register(email, password));
    },

    login: async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password } = loginSchema.parse(request.body);
      return reply.send(await service.login(email, password));
    },

    refresh: async (request: FastifyRequest, reply: FastifyReply) => {
      const { refreshToken } = refreshSchema.parse(request.body);
      return reply.send(await service.refresh(refreshToken));
    },

    logout: async (request: FastifyRequest, reply: FastifyReply) => {
      const { refreshToken } = refreshSchema.parse(request.body);
      await service.logout(refreshToken);
      return reply.status(204).send();
    },

    me: (request: FastifyRequest, reply: FastifyReply) => {
      const auth = getAuth(request);
      return reply.send({ userId: auth.userId, scopes: auth.scopes });
    },
  };
}
