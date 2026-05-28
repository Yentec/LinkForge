import type { FastifyInstance } from 'fastify';
import { prisma } from '@/shared/db';
import { authenticate } from '@/shared/middleware/authenticate';
import { createAuthRepository } from './auth.repository';
import { createAuthService } from './auth.service';
import { createAuthController } from './auth.controller';

export function authRoutes(app: FastifyInstance): void {
  const controller = createAuthController(createAuthService(createAuthRepository(prisma)));

  // Stricter than the global limit: account creation and login are abuse-prone.
  const strict = { rateLimit: { max: 10, timeWindow: '1 minute' } };

  app.post('/auth/register', { config: strict }, controller.register);
  app.post('/auth/login', { config: strict }, controller.login);
  app.post('/auth/refresh', controller.refresh);
  app.post('/auth/logout', controller.logout);
  app.get('/auth/me', { preHandler: authenticate }, controller.me);
}
