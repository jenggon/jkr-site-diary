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

interface ProgrammeCurrentRevisionRow {
  readonly current_revision_id: string | null;
}

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
    if (!result.value) {
      return Success(null);
    }
    const currentRevisionId = await this.findCurrentRevisionId(result.value.programme_id);
    if (isFailure(currentRevisionId)) {
      return Failure(currentRevisionId.error);
    }
    return Success(this.mapper.toRevisionDomain(result.value, currentRevisionId.value));
  }

  public async findByProgrammeId(programmeId: string): Promise<Result<ProgrammeRevision[], BaseAppError>> {
    const result = await this.adapter.selectMany<ProgrammeRevisionRow>(
      'programme_revision',
      { programme_id: programmeId },
      { orderBy: 'revision_no', ascending: true }
    );
    if (isFailure(result)) {
      return Failure(result.error);
    }
    const currentRevisionId = await this.findCurrentRevisionId(programmeId);
    if (isFailure(currentRevisionId)) {
      return Failure(currentRevisionId.error);
    }
    return Success(result.value.map((row) => this.mapper.toRevisionDomain(row, currentRevisionId.value)));
  }

  public async findActiveRevision(programmeId: string): Promise<Result<ProgrammeRevision | null, BaseAppError>> {
    const currentRevisionId = await this.findCurrentRevisionId(programmeId);
    if (isFailure(currentRevisionId)) {
      return Failure(currentRevisionId.error);
    }
    if (!currentRevisionId.value) {
      return Success(null);
    }
    const result = await this.adapter.selectOne<ProgrammeRevisionRow>('programme_revision', {
      programme_id: programmeId,
      revision_id: currentRevisionId.value,
    });
    if (isFailure(result)) {
      return Failure(result.error);
    }
    return Success(result.value ? this.mapper.toRevisionDomain(result.value, currentRevisionId.value) : null);
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
    const currentRevisionId = await this.findCurrentRevisionId(result.value.programme_id);
    if (isFailure(currentRevisionId)) {
      return Failure(currentRevisionId.error);
    }
    return Success(this.mapper.toRevisionDomain(result.value, currentRevisionId.value));
  }

  public async updateStatus(
    revisionId: string,
    status: ProgrammeRevisionStatus,
    actorId: string
  ): Promise<Result<ProgrammeRevision, BaseAppError>> {
    const updates: Record<string, unknown> = {
      status,
    };
    if (status === 'Approved') {
      updates.approved_at = nowIso();
      updates.approved_by = actorId;
    } else if (status === 'Archived') {
      updates.archived_at = nowIso();
      updates.archived_by = actorId;
    }

    const result = await this.adapter.update<ProgrammeRevisionRow>(
      'programme_revision',
      { revision_id: revisionId },
      updates
    );
    if (isFailure(result)) {
      return Failure(result.error);
    }
    const currentRevisionId = await this.findCurrentRevisionId(result.value.programme_id);
    if (isFailure(currentRevisionId)) {
      return Failure(currentRevisionId.error);
    }
    return Success(this.mapper.toRevisionDomain(result.value, currentRevisionId.value));
  }

  private async findCurrentRevisionId(
    programmeId: string
  ): Promise<Result<string | null, BaseAppError>> {
    const result = await this.adapter.selectOne<ProgrammeCurrentRevisionRow>('programme', {
      programme_id: programmeId,
    });
    if (isFailure(result)) {
      return Failure(result.error);
    }
    return Success(result.value?.current_revision_id ?? null);
  }
}
