import type { PrismaClient } from '@prisma/client';

// Fields safe to expose. The keyHash is never selected.
const publicSelect = {
  id: true,
  name: true,
  prefix: true,
  scopes: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
} as const;

export function createApiKeyRepository(db: PrismaClient) {
  return {
    create(data: {
      userId: string;
      name: string;
      keyHash: string;
      prefix: string;
      scopes: string[];
    }) {
      return db.apiKey.create({
        data,
        select: publicSelect,
      });
    },

    listByUser(userId: string) {
      return db.apiKey.findMany({
        where: { userId },
        select: publicSelect,
        orderBy: {
          createdAt: 'desc',
        },
      });
    },

    findById(id: string) {
      return db.apiKey.findUnique({
        where: { id },
      });
    },

    revoke(id: string) {
      return db.apiKey.update({
        where: { id },
        data: {
          revokedAt: new Date(),
        },
      });
    },
  };
}
