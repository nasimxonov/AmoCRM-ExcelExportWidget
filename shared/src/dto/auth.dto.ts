import { z } from 'zod';

export const sessionRequestSchema = z.object({
  accountId: z.number().int().positive(),
  subdomain: z.string().min(1),
  userId: z.number().int().positive(),
});

export type SessionRequestDto = z.infer<typeof sessionRequestSchema>;

export const sessionResponseSchema = z.object({
  token: z.string(),
  expiresIn: z.number().int().positive(),
});

export type SessionResponseDto = z.infer<typeof sessionResponseSchema>;
