import { z } from 'zod';

const slugPattern = /^[a-zA-Z0-9_-]{3,30}$/;

export const createLinkSchema = z.object({
  target: z.url(),
  customSlug: z
    .string()
    .regex(slugPattern, 'Slug must be 3-30 chars: a-z, A-Z, 0-9, _ or -')
    .optional(),
  expiresAt: z.iso.datetime().optional(),
});

export const updateLinkSchema = z
  .object({
    target: z.url().optional(),
    expiresAt: z.iso.datetime().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { error: 'At least one field is required' });

export const listLinksQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const linkIdParamsSchema = z.object({ id: z.uuid() });

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
export type ListLinksQuery = z.infer<typeof listLinksQuerySchema>;
