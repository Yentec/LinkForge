import { Errors } from '@/shared/errors/app-error';
import { generateToken, sha256 } from '@/shared/auth/tokens';

import type { createApiKeyRepository } from './api-keys.repository';

type ApiKeyRepository = ReturnType<typeof createApiKeyRepository>;

export type ApiKeyService = ReturnType<typeof createApiKeyService>;

export function createApiKeyService(repo: ApiKeyRepository) {
  return {
    /** Returns the raw key exactly once. Only its hash is persisted. */
    async create(userId: string, name: string, scopes: string[]) {
      const raw = `lf_live_${generateToken(24)}`;

      const created = await repo.create({
        userId,
        name,
        keyHash: sha256(raw),
        prefix: raw.slice(0, 16),
        scopes,
      });

      return {
        ...created,
        key: raw,
      };
    },

    list(userId: string) {
      return repo.listByUser(userId);
    },

    async revoke(userId: string, id: string): Promise<void> {
      const key = await repo.findById(id);

      if (!key || key.userId !== userId) {
        throw Errors.notFound('API key');
      }

      if (!key.revokedAt) {
        await repo.revoke(id);
      }
    },
  };
}
