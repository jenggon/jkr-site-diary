import { describe, it, expect, vi } from 'vitest';
import { Logger } from '@/lib/logger';

describe('logger', () => {
  it('should format log output as valid JSON with DEV-012H fields', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const logger = new Logger({ correlation_id: 'corr-123', actor_id: 'user-456' });
    logger.info('Test message', { action: 'test' });

    expect(writeSpy).toHaveBeenCalledTimes(1);
    const rawOutput = writeSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(rawOutput);

    expect(parsed.level).toBe('INFO');
    expect(parsed.message).toBe('Test message');
    expect(parsed.correlation_id).toBe('corr-123');
    expect(parsed.actor_id).toBe('user-456');
    expect(parsed.metadata).toEqual({ action: 'test' });

    writeSpy.mockRestore();
  });

  it('should mask sensitive data in context and metadata', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const logger = new Logger();
    logger.info('Login event', { password: 'secretpassword123', token: 'bearer-xyz' });

    const rawOutput = writeSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(rawOutput);

    expect(parsed.metadata.password).toBe('***MASKED***');
    expect(parsed.metadata.token).toBe('***MASKED***');

    writeSpy.mockRestore();
  });

  it('should support child logger context inheritance', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const parentLogger = new Logger({ service_name: 'parent-service', correlation_id: 'corr-777' });
    const childLogger = parentLogger.child({ module: 'ProgrammeService' });

    childLogger.info('Child event');

    const rawOutput = writeSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(rawOutput);

    expect(parsed.correlation_id).toBe('corr-777');
    expect(parsed.context.module).toBe('ProgrammeService');

    writeSpy.mockRestore();
  });

  it('should write ERROR and FATAL logs to stderr', () => {
    const errSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const logger = new Logger();
    logger.error('Critical failure');

    expect(errSpy).toHaveBeenCalledTimes(1);
    const rawOutput = errSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(rawOutput);
    expect(parsed.level).toBe('ERROR');

    errSpy.mockRestore();
  });
});
