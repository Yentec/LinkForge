import { z } from 'zod';

export const statsParamsSchema = z.object({
  id: z.uuid(),
});

export const statsQuerySchema = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  interval: z.enum(['day', 'week']).default('day'),
});

export type StatsQuery = z.infer<typeof statsQuerySchema>;
