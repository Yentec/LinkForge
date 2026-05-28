import { Errors } from '@/shared/errors/app-error';
import { env } from '@/config/env';
import { generateShortCode } from '@/shared/utils/short-code';
import { isSafePublicUrl } from '@/shared/utils/url';

import type { CacheService } from '@/shared/cache/cache.service';
import type { LinksRepository } from './links.repository';

import type { CreateLinkInput, UpdateLinkInput } from './links.schemas';

interface CreateOptions {
  userId: string;
  input: CreateLinkInput;
  idempotencyKey?: string;
}

export function createLinksService(repo: LinksRepository, cache: CacheService) {
  async function generateUniqueCode(maxAttempts = 5): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const code = generateShortCode();

      if (!(await repo.findByCode(code))) {
        return code;
      }
    }

    throw new Error('Unable to generate a unique short code');
  }

  function present(link: {
    id: string;
    code: string;
    target: string;
    expiresAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: link.id,
      code: link.code,
      target: link.target,
      shortUrl: `${env.BASE_URL}/${link.code}`,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
    };
  }

  return {
    async create({ userId, input, idempotencyKey }: CreateOptions) {
      if (!isSafePublicUrl(input.target)) {
        throw Errors.badRequest('Target must be a public http(s) URL');
      }

      if (idempotencyKey) {
        const cached = await cache.getJson<{
          linkId: string;
        }>(`idem:${userId}:${idempotencyKey}`);

        if (cached) {
          const existing = await repo.findById(cached.linkId);

          if (existing) {
            return present(existing);
          }
        }
      }

      if (input.customSlug) {
        const taken = await repo.findByCode(input.customSlug);

        if (taken) {
          throw Errors.conflict(`Slug "${input.customSlug}" is already taken`);
        }
      }

      const code = input.customSlug ?? (await generateUniqueCode());

      const defaultExpiry =
        env.LINK_DEFAULT_TTL_DAYS > 0
          ? new Date(Date.now() + env.LINK_DEFAULT_TTL_DAYS * 86_400_000)
          : null;

      const link = await repo.create({
        code,
        target: input.target,
        userId,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : defaultExpiry,
      });

      if (idempotencyKey) {
        await cache.setJson(`idem:${userId}:${idempotencyKey}`, { linkId: link.id }, 86_400);
      }

      return present(link);
    },

    async list(userId: string, limit: number, cursor?: string) {
      const rows = await repo.listByUser(userId, limit, cursor);

      const hasMore = rows.length > limit;

      const items = hasMore ? rows.slice(0, limit) : rows;

      return {
        items: items.map((link) => present(link)),

        nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
      };
    },

    async update(userId: string, id: string, input: UpdateLinkInput) {
      const link = await repo.findById(id);

      if (!link || link.userId !== userId) {
        throw Errors.notFound('Link');
      }

      if (input.target && !isSafePublicUrl(input.target)) {
        throw Errors.badRequest('Target must be a public http(s) URL');
      }

      const updated = await repo.update(id, {
        ...(input.target ? { target: input.target } : {}),

        ...(input.expiresAt !== undefined
          ? {
              expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            }
          : {}),
      });

      // Invalidate redirect cache
      await cache.del(`link:${link.code}`);

      return present(updated);
    },

    async remove(userId: string, id: string): Promise<void> {
      const link = await repo.findById(id);

      if (!link || link.userId !== userId) {
        throw Errors.notFound('Link');
      }

      await repo.softDelete(id);

      await cache.del(`link:${link.code}`);
    },
  };
}

export type LinksService = ReturnType<typeof createLinksService>;
