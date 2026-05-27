import { Prisma, type PrismaClient } from '@prisma/client';

type Interval = 'day' | 'week';

// Whitelisted physical columns for top-N grouping. Never user-provided.
const TOP_COLUMNS = {
  country: 'country',
  referrer: 'referrerHost',
  device: 'deviceType',
  browser: 'browser',
} as const;

export type TopDimension = keyof typeof TOP_COLUMNS;

interface Bucket {
  bucket: Date;
  count: number;
}

interface TopRow {
  key: string;
  count: number;
}

export type AnalyticsRepository = ReturnType<typeof createAnalyticsRepository>;

export const createAnalyticsRepository = (db: PrismaClient) => {
  return {
    countClicks(linkId: string, from: Date, to: Date): Promise<number> {
      return db.click.count({
        where: {
          linkId,
          createdAt: {
            gte: from,
            lt: to,
          },
        },
      });
    },

    // count(*)::int returns int4 -> mapped to number, avoiding bigint serialization.
    timeSeries(linkId: string, from: Date, to: Date, interval: Interval): Promise<Bucket[]> {
      return db.$queryRaw<Bucket[]>(Prisma.sql`
        SELECT
          date_trunc(${interval}, "createdAt") AS bucket,
          count(*)::int AS count
        FROM "clicks"
        WHERE
          "linkId" = ${linkId}::uuid
          AND "createdAt" >= ${from}
          AND "createdAt" < ${to}
        GROUP BY bucket
        ORDER BY bucket ASC
      `);
    },

    topBy(linkId: string, from: Date, to: Date, dimension: TopDimension): Promise<TopRow[]> {
      // Prisma.raw is safe here: the column comes from a fixed internal map.
      const column = Prisma.raw(`coalesce("${TOP_COLUMNS[dimension]}"::text, 'unknown')`);

      return db.$queryRaw<TopRow[]>(Prisma.sql`
        SELECT
          ${column} AS key,
          count(*)::int AS count
        FROM "clicks"
        WHERE
          "linkId" = ${linkId}::uuid
          AND "createdAt" >= ${from}
          AND "createdAt" < ${to}
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 5
      `);
    },
  };
};
