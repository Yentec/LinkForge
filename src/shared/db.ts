import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '@/config/env';

export const prisma = new PrismaClient({
  adapter: new PrismaPg(env.DATABASE_URL),
  log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

export async function checkDbConnection(): Promise<void> {
  const db = prisma as unknown as { $queryRaw: (tpl: TemplateStringsArray) => Promise<unknown> };
  await db.$queryRaw`SELECT 1`;
}

export async function disconnectDb(): Promise<void> {
  const db = prisma as unknown as { $disconnect: () => Promise<void> };
  await db.$disconnect();
}
