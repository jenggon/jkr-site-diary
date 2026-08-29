import { nowIso } from './clock';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogContext {
  readonly service_name?: string | undefined;
  readonly correlation_id?: string | undefined;
  readonly actor_id?: string | undefined;
  readonly programme_id?: string | undefined;
  readonly module?: string | undefined;
  readonly [key: string]: unknown;
}

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly service_name: string;
  readonly correlation_id?: string | undefined;
  readonly actor_id?: string | undefined;
  readonly programme_id?: string | undefined;
  readonly message: string;
  readonly context?: LogContext | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'authorization',
  'auth',
  'apikey',
  'api_key',
  'bearer',
]);

function maskValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEYS.has(key.toLowerCase())) {
    return '***MASKED***';
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return maskObject(value as Record<string, unknown>);
  }
  return value;
}

function maskObject(obj: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    masked[key] = maskValue(key, val);
  }
  return masked;
}

export class Logger {
  private readonly defaultContext: LogContext;

  constructor(defaultContext: LogContext = {}) {
    this.defaultContext = Object.freeze({
      service_name: 'jkr-site-diary-backend',
      ...defaultContext,
    });
  }

  public child(childContext: LogContext): Logger {
    return new Logger({
      ...this.defaultContext,
      ...childContext,
    });
  }

  private writeLog(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: nowIso(),
      level,
      service_name: this.defaultContext.service_name ?? 'jkr-site-diary-backend',
      correlation_id: this.defaultContext.correlation_id,
      actor_id: this.defaultContext.actor_id,
      programme_id: this.defaultContext.programme_id,
      message,
      context: maskObject(this.defaultContext as Record<string, unknown>) as LogContext,
      ...(meta !== undefined ? { metadata: maskObject(meta) } : {}),
    };

    const jsonString = JSON.stringify(entry) + '\n';
    if (level === 'ERROR' || level === 'FATAL') {
      process.stderr.write(jsonString);
    } else {
      process.stdout.write(jsonString);
    }
  }

  public debug(message: string, meta?: Record<string, unknown>): void {
    this.writeLog('DEBUG', message, meta);
  }

  public info(message: string, meta?: Record<string, unknown>): void {
    this.writeLog('INFO', message, meta);
  }

  public warn(message: string, meta?: Record<string, unknown>): void {
    this.writeLog('WARN', message, meta);
  }

  public error(message: string, meta?: Record<string, unknown>): void {
    this.writeLog('ERROR', message, meta);
  }

  public fatal(message: string, meta?: Record<string, unknown>): void {
    this.writeLog('FATAL', message, meta);
  }
}

export const logger = new Logger();
