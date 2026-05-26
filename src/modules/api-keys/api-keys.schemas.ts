import { z } from 'zod';

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(60),
  scopes: z
    .array(z.enum(['read', 'write']))
    .min(1)
    .default(['read']),
});

export const apiKeyIdParamsSchema = z.object({
  id: z.uuid(),
});
