import { describe, it, expect } from 'vitest';
import { validateEnv, isDevelopment, isProduction, isTest } from '@/lib/env';

describe('env', () => {
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
});
