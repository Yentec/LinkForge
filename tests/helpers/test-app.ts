import type { FastifyInstance } from 'fastify';
import { buildApp } from '@/app';
import { prisma } from '@/shared/db';

export async function buildTestApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.ready();
  return app;
}

export async function resetDb(): Promise<void> {
  // Cascade clears refresh_tokens and api_keys via FK.
  await prisma.$executeRawUnsafe('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
}
