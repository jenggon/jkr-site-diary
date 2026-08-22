import { z } from 'zod';
import { ENVIRONMENTS } from './constants';

export const envSchema = z.object({
  NODE_ENV: z
    .enum([ENVIRONMENTS.DEVELOPMENT, ENVIRONMENTS.PRODUCTION, ENVIRONMENTS.TEST])
    .default(ENVIRONMENTS.DEVELOPMENT),
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1).default('https://placeholder-project.supabase.co'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default('placeholder-anon-key'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

export type EnvConfig = Readonly<z.infer<typeof envSchema>>;

export function validateEnv(customEnv?: Record<string, string | undefined>): EnvConfig {
  const targetEnv = customEnv ?? {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    LOG_LEVEL: process.env.LOG_LEVEL,
  };
  const result = envSchema.safeParse(targetEnv);

  if (!result.success) {
    const formattedErrors = result.error.format();
    throw new Error(`Environment validation failed: ${JSON.stringify(formattedErrors)}`);
  }

  return Object.freeze(result.data);
}

export const env: EnvConfig = validateEnv();

export function isDevelopment(currentEnv: EnvConfig = env): boolean {
  return currentEnv.NODE_ENV === ENVIRONMENTS.DEVELOPMENT;
}

export function isProduction(currentEnv: EnvConfig = env): boolean {
  return currentEnv.NODE_ENV === ENVIRONMENTS.PRODUCTION;
}

export function isTest(currentEnv: EnvConfig = env): boolean {
  return currentEnv.NODE_ENV === ENVIRONMENTS.TEST;
}
