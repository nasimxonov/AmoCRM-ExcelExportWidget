import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url(),
  WIDGET_URL: z.string().url(),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().optional().default(''),

  AMOCRM_SUBDOMAIN: z.string().min(1, 'AMOCRM_SUBDOMAIN is required'),
  AMOCRM_LONG_LIVED_TOKEN: z.string().min(1, 'AMOCRM_LONG_LIVED_TOKEN is required'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('12h'),

  CORS_ORIGINS: z.string().min(1),

  EXPORT_STORAGE_DIR: z.string().default('./storage/exports'),

  THROTTLE_TTL: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
});

export type EnvShape = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvShape {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
