import { Errors } from '@/shared/errors/app-error';
import type { CacheService } from '@/shared/cache/cache.service';
import type { LinksRepository } from '@/modules/links/links.repository';
import type { AnalyticsRepository } from './analytics.repository';
import type { StatsQuery } from './analytics.schemas';

const STATS_TTL_SECONDS = 60;
const DEFAULT_WINDOW_DAYS = 30;

export type AnalyticsService = ReturnType<typeof createAnalyticsService>;

export const createAnalyticsService = (
  analytics: AnalyticsRepository,
  links: LinksRepository,
  cache: CacheService,
) => {
  return {
    async getStats(userId: string, linkId: string, query: StatsQuery) {
      const link = await links.findById(linkId);

      if (!link || link.userId !== userId) {
        throw Errors.notFound('Link');
      }

      const to = query.to ? new Date(query.to) : new Date();

      const from = query.from
        ? new Date(query.from)
        : new Date(to.getTime() - DEFAULT_WINDOW_DAYS * 86_400_000);

      if (from >= to) {
        throw Errors.badRequest('"from" must be earlier than "to"');
      }

      const cacheKey = ['stats', linkId, from.toISOString(), to.toISOString(), query.interval].join(
        ':',
      );

      const cached = await cache.getJson<object>(cacheKey);

      if (cached) {
        return cached;
      }

      const [total, series, countries, referrers, devices, browsers] = await Promise.all([
        analytics.countClicks(linkId, from, to),

        analytics.timeSeries(linkId, from, to, query.interval),

        analytics.topBy(linkId, from, to, 'country'),

        analytics.topBy(linkId, from, to, 'referrer'),

        analytics.topBy(linkId, from, to, 'device'),

        analytics.topBy(linkId, from, to, 'browser'),
      ]);

      const result = {
        linkId,
        code: link.code,

        range: {
          from: from.toISOString(),
          to: to.toISOString(),
          interval: query.interval,
        },

        totalClicks: total,

        timeseries: series.map((bucket) => ({
          date: new Date(bucket.bucket).toISOString(),
          count: bucket.count,
        })),

        topCountries: countries,
        topReferrers: referrers,
        topDevices: devices,
        topBrowsers: browsers,
      };

      await cache.setJson(cacheKey, result, STATS_TTL_SECONDS);

      return result;
    },
  };
};
