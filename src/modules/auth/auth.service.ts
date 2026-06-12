import { randomUUID } from 'crypto';
import { Errors } from '@/shared/errors/app-error';
import { hashPassword, verifyPassword } from '@/shared/auth/password';
import { ACCESS_TTL_SECONDS, signAccessToken } from '@/shared/auth/jwt';
import { generateToken, sha256 } from '@/shared/auth/tokens';
import { logger } from '@/config/logger';

import type { createAuthRepository } from './auth.repository';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

type AuthRepository = ReturnType<typeof createAuthRepository>;

export type AuthService = ReturnType<typeof createAuthService>;

export function createAuthService(repo: AuthRepository) {
  async function issueTokens(
    userId: string,
    email: string,
    chainId = randomUUID(),
  ): Promise<AuthTokens> {
    const accessToken = await signAccessToken({ userId, email });

    const refreshToken = generateToken();

    await repo.createRefreshToken(
      sha256(refreshToken),
      userId,
      new Date(Date.now() + REFRESH_TTL_MS),
      chainId,
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TTL_SECONDS,
    };
  }

  return {
    async register(email: string, password: string): Promise<AuthTokens> {
      const existing = await repo.findByEmail(email);

      if (existing) {
        throw Errors.conflict('Email already registered');
      }

      const user = await repo.createUser(email, await hashPassword(password));

      return issueTokens(user.id, user.email);
    },

    async login(email: string, password: string): Promise<AuthTokens> {
      const user = await repo.findByEmail(email);

      // Same error whether the email is unknown or the password is wrong
      if (!user) {
        throw Errors.unauthorized('Invalid credentials');
      }

      const validPassword = await verifyPassword(user.password, password);

      if (!validPassword) {
        throw Errors.unauthorized('Invalid credentials');
      }

      return issueTokens(user.id, user.email);
    },

    async refresh(rawToken: string): Promise<AuthTokens> {
      const stored = await repo.findRefreshToken(sha256(rawToken));

      if (!stored || stored.expiresAt < new Date()) {
        throw Errors.unauthorized('Invalid refresh token');
      }

      if (stored.revokedAt) {
        // Presented token was already rotated: replay detected, revoke entire chain.
        await repo.revokeChain(stored.chainId);
        logger.warn(
          { userId: stored.userId, chainId: stored.chainId },
          'refresh token replay detected — chain revoked',
        );
        throw Errors.unauthorized('Invalid refresh token');
      }

      // Rotation: token is single-use, new token inherits the same chain.
      await repo.revokeRefreshToken(stored.id);

      return issueTokens(stored.userId, stored.user.email, stored.chainId);
    },

    async logout(rawToken: string): Promise<void> {
      const stored = await repo.findRefreshToken(sha256(rawToken));

      if (stored && !stored.revokedAt) {
        await repo.revokeRefreshToken(stored.id);
      }
    },
  };
}
