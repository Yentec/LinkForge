import type { PrismaClient } from '@prisma/client';

export function createAuthRepository(db: PrismaClient) {
  return {
    findByEmail(email: string) {
      return db.user.findUnique({
        where: { email },
      });
    },

    createUser(email: string, password: string) {
      return db.user.create({
        data: { email, password },
      });
    },

    createRefreshToken(tokenHash: string, userId: string, expiresAt: Date, chainId: string) {
      return db.refreshToken.create({
        data: {
          tokenHash,
          userId,
          expiresAt,
          chainId,
        },
      });
    },

    findRefreshToken(tokenHash: string) {
      return db.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });
    },

    revokeRefreshToken(id: string) {
      return db.refreshToken.update({
        where: { id },
        data: { revokedAt: new Date() },
      });
    },

    revokeChain(chainId: string) {
      return db.refreshToken.updateMany({
        where: { chainId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    },
  };
}
