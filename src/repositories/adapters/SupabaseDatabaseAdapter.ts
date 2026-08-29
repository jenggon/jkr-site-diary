import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/lib/supabase';
import { Result, Success, Failure } from '@/lib/result';
import { BaseAppError, InfrastructureError } from '@/lib/errors';
import { ProgrammeAlreadyExistsError, ProgrammeNotFoundError } from '@/errors/programmeErrors';
import { ActivityRevisionSupersededError } from '@/errors/activityErrors';
import { SiteDiaryRevisionNotApprovedError } from '@/errors/siteDiaryErrors';
import { IDatabaseAdapter } from './IDatabaseAdapter';

export class SupabaseDatabaseAdapter implements IDatabaseAdapter {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient = getSupabaseServerClient()) {
    this.client = client;
  }

  private handlePostgresError(error: { code?: string; message: string }): BaseAppError {
    if (error.code === '23505') {
      return new ProgrammeAlreadyExistsError(`Duplicate key constraint violation: ${error.message}`);
    }
    if (error.code === 'PGRST116') {
      return new ProgrammeNotFoundError(`Resource not found: ${error.message}`);
    }
    if (error.code === 'P0001' && error.message.includes('ACTIVITY_REVISION_SUPERSEDED')) {
      return new ActivityRevisionSupersededError(error.message);
    }
    if (error.code === 'P0001' && error.message.includes('SITE_DIARY_REVISION_SUPERSEDED')) {
      return new SiteDiaryRevisionNotApprovedError(error.message);
    }
    return new InfrastructureError(`Database error [${error.code ?? 'UNKNOWN'}]: ${error.message}`);
  }

  public async selectOne<T>(table: string, filter: Record<string, unknown>): Promise<Result<T | null, BaseAppError>> {
    try {
      let query = this.client.from(table).select('*');
      for (const [key, val] of Object.entries(filter)) {
        query = query.eq(key, val);
      }
      const { data, error } = await query.maybeSingle();
      if (error) {
        return Failure(this.handlePostgresError(error));
      }
      return Success((data as T) ?? null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database query exception';
      return Failure(new InfrastructureError(msg, { cause: err }));
    }
  }

  public async selectMany<T>(
    table: string,
    filter?: Record<string, unknown>,
    options?: { limit?: number; offset?: number; orderBy?: string; ascending?: boolean }
  ): Promise<Result<T[], BaseAppError>> {
    try {
      let query = this.client.from(table).select('*');
      if (filter) {
        for (const [key, val] of Object.entries(filter)) {
          if (val !== undefined) {
            if (Array.isArray(val)) {
              query = query.in(key, val);
            } else {
              query = query.eq(key, val);
            }
          }
        }
      }
      if (options?.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? true });
      }
      if (options?.offset !== undefined && options?.limit !== undefined) {
        query = query.range(options.offset, options.offset + options.limit - 1);
      } else if (options?.limit !== undefined) {
        query = query.limit(options.limit);
      }
      const { data, error } = await query;
      if (error) {
        return Failure(this.handlePostgresError(error));
      }
      return Success((data as T[]) ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database query exception';
      return Failure(new InfrastructureError(msg, { cause: err }));
    }
  }

  public async insert<T>(table: string, row: Record<string, unknown>): Promise<Result<T, BaseAppError>> {
    try {
      const { data, error } = await this.client.from(table).insert(row).select().single();
      if (error) {
        return Failure(this.handlePostgresError(error));
      }
      return Success(data as T);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database insert exception';
      return Failure(new InfrastructureError(msg, { cause: err }));
    }
  }

  public async update<T>(
    table: string,
    filter: Record<string, unknown>,
    updates: Record<string, unknown>
  ): Promise<Result<T, BaseAppError>> {
    try {
      let query = this.client.from(table).update(updates);
      for (const [key, val] of Object.entries(filter)) {
        query = query.eq(key, val);
      }
      const { data, error } = await query.select().single();
      if (error) {
        return Failure(this.handlePostgresError(error));
      }
      return Success(data as T);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database update exception';
      return Failure(new InfrastructureError(msg, { cause: err }));
    }
  }

  public async exists(table: string, filter: Record<string, unknown>): Promise<Result<boolean, BaseAppError>> {
    try {
      let query = this.client.from(table).select('programme_id', { count: 'exact', head: true });
      for (const [key, val] of Object.entries(filter)) {
        query = query.eq(key, val);
      }
      const { count, error } = await query;
      if (error) {
        return Failure(this.handlePostgresError(error));
      }
      return Success((count ?? 0) > 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database exists check exception';
      return Failure(new InfrastructureError(msg, { cause: err }));
    }
  }
}
