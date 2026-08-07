import { Result, Success, Failure, isFailure } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { nowIso } from '@/lib/clock';
import { Programme, ProgrammeStatus } from '@/types/programme';
import { IProgrammeRepository } from './IProgrammeRepository';
import { IDatabaseAdapter, IDatabaseAdapterOptions } from './adapters/IDatabaseAdapter';
import { SupabaseDatabaseAdapter } from './adapters/SupabaseDatabaseAdapter';
import { IProgrammeRowMapper } from './mappers/IProgrammeRowMapper';
import { ProgrammeRowMapper } from './mappers/ProgrammeRowMapper';
import { ProgrammeRow } from './types/programmeRow';

export class ProgrammeRepository implements IProgrammeRepository {
  private readonly adapter: IDatabaseAdapter;
  private readonly mapper: IProgrammeRowMapper;

  constructor(
    adapter: IDatabaseAdapter = new SupabaseDatabaseAdapter(),
    mapper: IProgrammeRowMapper = new ProgrammeRowMapper()
  ) {
    this.adapter = adapter;
    this.mapper = mapper;
  }

  public async findById(id: string): Promise<Result<Programme | null, BaseAppError>> {
    const result = await this.adapter.selectOne<ProgrammeRow>('programme', { programme_id: id });
    if (isFailure(result)) {
      return Failure(result.error);
    }
    return Success(result.value ? this.mapper.toDomain(result.value) : null);
  }

  public async findByCode(code: string): Promise<Result<Programme | null, BaseAppError>> {
    const result = await this.adapter.selectOne<ProgrammeRow>('programme', { programme_code: code });
    if (isFailure(result)) {
      return Failure(result.error);
    }
    return Success(result.value ? this.mapper.toDomain(result.value) : null);
  }

  public async findAll(params?: {
    status?: ProgrammeStatus | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<Result<Programme[], BaseAppError>> {
    const filter = params?.status !== undefined ? { status: params.status } : undefined;
    const options: IDatabaseAdapterOptions = {
      orderBy: 'created_at',
      ascending: false,
      ...(params?.limit !== undefined ? { limit: params.limit } : {}),
      ...(params?.offset !== undefined ? { offset: params.offset } : {}),
    };

    const result = await this.adapter.selectMany<ProgrammeRow>('programme', filter, options);
    if (isFailure(result)) {
      return Failure(result.error);
    }
    return Success(result.value.map((row) => this.mapper.toDomain(row)));
  }

  public async existsByCode(code: string): Promise<Result<boolean, BaseAppError>> {
    return this.adapter.exists('programme', { programme_code: code });
  }

  public async create(programme: Programme): Promise<Result<Programme, BaseAppError>> {
    const row = this.mapper.toRow(programme);
    const result = await this.adapter.insert<ProgrammeRow>('programme', row as unknown as Record<string, unknown>);
    if (isFailure(result)) {
      return Failure(result.error);
    }
    return Success(this.mapper.toDomain(result.value));
  }

  public async update(programme: Programme): Promise<Result<Programme, BaseAppError>> {
    const row = this.mapper.toRow(programme);
    const result = await this.adapter.update<ProgrammeRow>(
      'programme',
      { programme_id: programme.programmeId },
      row as unknown as Record<string, unknown>
    );
    if (isFailure(result)) {
      return Failure(result.error);
    }
    return Success(this.mapper.toDomain(result.value));
  }

  public async archive(id: string, actorId: string): Promise<Result<Programme, BaseAppError>> {
    const updates = {
      status: 'Archived',
      archived_at: nowIso(),
      archived_by: actorId,
    };
    const result = await this.adapter.update<ProgrammeRow>('programme', { programme_id: id }, updates);
    if (isFailure(result)) {
      return Failure(result.error);
    }
    return Success(this.mapper.toDomain(result.value));
  }

  public async setCurrentRevision(programmeId: string, revisionId: string): Promise<Result<void, BaseAppError>> {
    const updates = { current_revision_id: revisionId, updated_at: nowIso() };
    const result = await this.adapter.update<ProgrammeRow>('programme', { programme_id: programmeId }, updates);
    if (isFailure(result)) {
      return Failure(result.error);
    }
    return Success(undefined);
  }

  public async setLockStatus(programmeId: string, isLocked: boolean): Promise<Result<void, BaseAppError>> {
    const updates = { is_locked: isLocked, updated_at: nowIso() };
    const result = await this.adapter.update<ProgrammeRow>('programme', { programme_id: programmeId }, updates);
    if (isFailure(result)) {
      return Failure(result.error);
    }
    return Success(undefined);
  }
}
