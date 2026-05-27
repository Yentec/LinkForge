import { z } from 'zod';

// Matches both generated codes and custom slugs (3-30 chars).
export const redirectParamsSchema = z.object({
  code: z.string().min(1).max(30),
});
