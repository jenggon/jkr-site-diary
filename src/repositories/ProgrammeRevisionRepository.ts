import { Result, Success, Failure, isFailure } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { nowIso } from '@/lib/clock';
import { ProgrammeRevision, ProgrammeRevisionStatus } from '@/types/programmeRevision';
import { IProgrammeRevisionRepository } from './IProgrammeRevisionRepository';
import { IDatabaseAdapter } from './adapters/IDatabaseAdapter';
import { SupabaseDatabaseAdapter } from './adapters/SupabaseDatabaseAdapter';
import { IProgrammeRowMapper } from './mappers/IProgrammeRowMapper';
import { ProgrammeRowMapper } from './mappers/ProgrammeRowMapper';
import { ProgrammeRevisionRow } from './types/programmeRow';

export class ProgrammeRevisionRepository implements IProgrammeRevisionRepository {
  private readonly adapter: IDatabaseAdapter;
  private readonly mapper: IProgrammeRowMapper;

  constructor(
    adapter: IDatabaseAdapter = new SupabaseDatabaseAdapter(),
    mapper: IProgrammeRowMapper = new ProgrammeRowMapper()
  ) {
    this.adapter = adapter;
    this.mapper = mapper;
  }

  public async findById(revisionId: string): Promise<Result<ProgrammeRevision | null, BaseAppError>> {
    const result = await this.adapter.selectOne<ProgrammeRevisionRow>('programme_revision', {
      revision_id: revisionId,
    });
    if (isFailure(result)) {
      return Failure(result.error);
    }
    return Success(result.value ? this.mapper.toRevisionDomain(result.value) : null);
  }

  public async findByProgrammeId(programmeId: string): Promise<Result<ProgrammeRevision[], BaseAppError>> {
    const result = await this.adapter.selectMany<ProgrammeRevisionRow>(
      'programme_revision',
      { programme_id: programmeId },
      { orderBy: 'revision_number', ascending: true }
    );
    if (isFailure(result)) {
      return Failure(result.error);
    }
    return Success(result.value.map((row) => this.mapper.toRevisionDomain(row)));
  }

  public async findActiveRevision(programmeId: string): Promise<Result<ProgrammeRevision | null, BaseAppError>> {
    const result = await this.adapter.selectOne<ProgrammeRevisionRow>('programme_revision', {
      programme_id: programmeId,
      is_current: true,
    });
    if (isFailure(result)) {
      return Failure(result.error);
    }
    return Success(result.value ? this.mapper.toRevisionDomain(result.value) : null);
  }

  public async create(revision: ProgrammeRevision): Promise<Result<ProgrammeRevision, BaseAppError>> {
    const row = this.mapper.toRevisionRow(revision);
    const result = await this.adapter.insert<ProgrammeRevisionRow>(
      'programme_revision',
      row as unknown as Record<string, unknown>
    );
    if (isFailure(result)) {
      return Failure(result.error);
    }
    return Success(this.mapper.toRevisionDomain(result.value));
  }

  public async updateStatus(
    revisionId: string,
    status: ProgrammeRevisionStatus,
    actorId: string
  ): Promise<Result<ProgrammeRevision, BaseAppError>> {
    const updates: Record<string, unknown> = {
      status,
      updated_at: nowIso(),
      updated_by: actorId,
    };
    if (status === 'Approved') {
      updates.approved_at = nowIso();
      updates.approved_by = actorId;
      updates.is_current = true;
    } else if (status === 'Superseded') {
      updates.is_current = false;
    }

    const result = await this.adapter.update<ProgrammeRevisionRow>(
      'programme_revision',
      { revision_id: revisionId },
      updates
    );
    if (isFailure(result)) {
      return Failure(result.error);
    }
    return Success(this.mapper.toRevisionDomain(result.value));
  }
}
