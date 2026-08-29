import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';

export interface IDatabaseAdapterOptions {
  readonly limit?: number | undefined;
  readonly offset?: number | undefined;
  readonly orderBy?: string | undefined;
  readonly ascending?: boolean | undefined;
}

export interface IDatabaseAdapter {
  selectOne<T>(table: string, filter: Record<string, unknown>): Promise<Result<T | null, BaseAppError>>;
  selectMany<T>(
    table: string,
    filter?: Record<string, unknown>,
    options?: IDatabaseAdapterOptions
  ): Promise<Result<T[], BaseAppError>>;
  insert<T>(table: string, row: Record<string, unknown>): Promise<Result<T, BaseAppError>>;
  update<T>(table: string, filter: Record<string, unknown>, updates: Record<string, unknown>): Promise<Result<T, BaseAppError>>;
  exists(table: string, filter: Record<string, unknown>): Promise<Result<boolean, BaseAppError>>;
}
