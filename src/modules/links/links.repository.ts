import type { Prisma, PrismaClient } from '@prisma/client';

export function createLinksRepository(db: PrismaClient) {
  return {
    findByCode(code: string) {
      return db.link.findFirst({
        where: {
          code,
          deletedAt: null,
        },
      });
    },

    findById(id: string) {
      return db.link.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });
    },

    create(data: { code: string; target: string; userId: string; expiresAt?: Date | null }) {
      return db.link.create({
        data,
      });
    },

    /** Cursor pagination: fetch limit+1 to detect whether another page exists. */
    listByUser(userId: string, limit: number, cursorId?: string) {
      return db.link.findMany({
        where: {
          userId,
          deletedAt: null,
        },

        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],

        take: limit + 1,

        ...(cursorId
          ? {
              cursor: { id: cursorId },
              skip: 1,
            }
          : {}),
      });
    },

    update(id: string, data: Prisma.LinkUpdateInput) {
      return db.link.update({
        where: { id },
        data,
      });
    },

    softDelete(id: string) {
      return db.link.update({
        where: { id },

        data: {
          deletedAt: new Date(),
        },
      });
    },
  };
}

export type LinksRepository = ReturnType<typeof createLinksRepository>;
