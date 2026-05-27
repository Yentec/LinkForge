import { Errors } from '@/shared/errors/app-error';
import type { CacheService } from '@/shared/cache/cache.service';
import type { LinksRepository } from '@/modules/links/links.repository';

interface CachedLink {
  id: string;
  target: string;
  expiresAt: string | null;
}

const CACHE_TTL_SECONDS = 300;

const assertNotExpired = (expiresAt: Date | null): void => {
  if (expiresAt && expiresAt < new Date()) {
    throw Errors.gone('This link has expired');
  }
};

export type RedirectService = ReturnType<typeof createRedirectService>;

export const createRedirectService = (repo: LinksRepository, cache: CacheService) => {
  return {
    async resolve(code: string): Promise<{ id: string; target: string }> {
      const cacheKey = `link:${code}`;

      const cached = await cache.getJson<CachedLink>(cacheKey);

      if (cached) {
        assertNotExpired(cached.expiresAt ? new Date(cached.expiresAt) : null);

        return {
          id: cached.id,
          target: cached.target,
        };
      }

      const link = await repo.findByCode(code);

      if (!link) {
        throw Errors.notFound('Link');
      }

      assertNotExpired(link.expiresAt);

      await cache.setJson(
        cacheKey,
        {
          id: link.id,
          target: link.target,
          expiresAt: link.expiresAt,
        },
        CACHE_TTL_SECONDS,
      );

      return {
        id: link.id,
        target: link.target,
      };
    },
  };
};
