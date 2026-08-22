import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateEnv, isDevelopment, isProduction, isTest } from '@/lib/env';

describe('env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('should validate environment variables with defaults', () => {
    const validated = validateEnv({});
    expect(validated.NODE_ENV).toBe('development');
    expect(validated.LOG_LEVEL).toBe('info');
    expect(Object.isFrozen(validated)).toBe(true);
  });

  it('should correctly evaluate runtime environment helpers', () => {
    const devEnv = validateEnv({ NODE_ENV: 'development' });
    const prodEnv = validateEnv({ NODE_ENV: 'production' });
    const testEnv = validateEnv({ NODE_ENV: 'test' });

    expect(isDevelopment(devEnv)).toBe(true);
    expect(isProduction(devEnv)).toBe(false);
    expect(isTest(devEnv)).toBe(false);

    expect(isProduction(prodEnv)).toBe(true);
    expect(isTest(testEnv)).toBe(true);
  });

  it('should throw error when invalid LOG_LEVEL is passed', () => {
    expect(() => validateEnv({ LOG_LEVEL: 'invalid_level' as unknown as string })).toThrow();
  });

  // F2.7-C02 Explicit tests
  it('1. customEnv injection still works', () => {
    const custom = validateEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://custom.supabase.co' });
    expect(custom.NEXT_PUBLIC_SUPABASE_URL).toBe('https://custom.supabase.co');
  });

  it('2. explicit NEXT_PUBLIC Supabase URL is preserved', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://explicit-url.supabase.co');
    const validated = validateEnv();
    expect(validated.NEXT_PUBLIC_SUPABASE_URL).toBe('https://explicit-url.supabase.co');
  });

  it('3. explicit NEXT_PUBLIC anon key is preserved', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'explicit-anon-key');
    const validated = validateEnv();
    expect(validated.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('explicit-anon-key');
  });

  it('3a. accepts any non-empty anon key without replacing it with the placeholder', () => {
    const unusualButValidKey = 'not-a-jwt::still-non-empty';
    const validated = validateEnv({ NEXT_PUBLIC_SUPABASE_ANON_KEY: unusualButValidKey });

    expect(validated.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe(unusualButValidKey);
    expect(validated.NEXT_PUBLIC_SUPABASE_ANON_KEY).not.toBe('placeholder-anon-key');
  });

  it('3b. rejects an empty anon key under the existing non-empty string contract', () => {
    expect(() => validateEnv({ NEXT_PUBLIC_SUPABASE_ANON_KEY: '' })).toThrow(
      /Environment validation failed/
    );
  });

  it('4. browser-safe configuration does not fall through to placeholders when valid values exist', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://real.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'real-anon');
    const validated = validateEnv();
    expect(validated.NEXT_PUBLIC_SUPABASE_URL).not.toContain('placeholder');
    expect(validated.NEXT_PUBLIC_SUPABASE_URL).toBe('https://real.supabase.co');
    expect(validated.NEXT_PUBLIC_SUPABASE_ANON_KEY).not.toContain('placeholder');
    expect(validated.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('real-anon');
  });

  it('5. server-only service-role semantics are preserved', () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'secret-service-role');
    const validated = validateEnv();
    expect(validated.SUPABASE_SERVICE_ROLE_KEY).toBe('secret-service-role');
    
    // Prove it is omitted when not provided
    const noServiceRole = validateEnv({});
    expect(noServiceRole.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });

  it('5a. public-only customEnv construction cannot inherit a host service-role secret', () => {
    const syntheticSecret = 'synthetic-service-role-sentinel';
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', syntheticSecret);

    const publicConfig = validateEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://public-only.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-anon-key',
    });

    expect(publicConfig).not.toHaveProperty('SUPABASE_SERVICE_ROLE_KEY');
    expect(JSON.stringify(publicConfig)).not.toContain(syntheticSecret);
  });

  it('5b. source contract does not create a public service-role environment variable', () => {
    const envSource = readFileSync(resolve(process.cwd(), 'src/lib/env.ts'), 'utf8');

    expect(envSource).not.toContain('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
  });

  it('6. malformed required public env still follows intended validation behavior', () => {
    expect(() => validateEnv({ NEXT_PUBLIC_SUPABASE_URL: '' })).toThrow(/Environment validation failed/);
  });

  it('7. fails if whole-object dynamic process.env usage is restored', () => {
    const originalEnv = process.env;
    
    const envProxy = new Proxy(originalEnv, {
      ownKeys() {
        throw new Error('Whole-object dynamic process.env usage is forbidden for Next.js browser compatibility.');
      }
    });

    Object.defineProperty(process, 'env', { value: envProxy, configurable: true });

    try {
      expect(() => validateEnv()).not.toThrow('Whole-object dynamic process.env usage is forbidden for Next.js browser compatibility.');
    } finally {
      Object.defineProperty(process, 'env', { value: originalEnv, configurable: true });
    }
  });
});
