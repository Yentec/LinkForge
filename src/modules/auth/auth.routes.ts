import type { FastifyInstance } from 'fastify';
import { prisma } from '@/shared/db';
import { authenticate } from '@/shared/middleware/authenticate';
import { createAuthRepository } from './auth.repository';
import { createAuthService } from './auth.service';
import { createAuthController } from './auth.controller';

export function authRoutes(app: FastifyInstance): void {
  const controller = createAuthController(createAuthService(createAuthRepository(prisma)));

  app.post('/auth/register', controller.register);
  app.post('/auth/login', controller.login);
  app.post('/auth/refresh', controller.refresh);
  app.post('/auth/logout', controller.logout);
  app.get('/auth/me', { preHandler: authenticate }, controller.me);
}
