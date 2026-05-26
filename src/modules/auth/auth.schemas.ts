import { z } from 'zod';

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

export const loginSchema = registerSchema;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
