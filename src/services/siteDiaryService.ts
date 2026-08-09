import { Result, Success, Failure, isFailure } from '@/lib/result';
import { BaseAppError, UnknownError } from '@/lib/errors';
import { Logger } from '@/lib/logger';
import { SystemClock } from '@/lib/clock';
import { generateUuid } from '@/lib/uuid';
import { SiteDiary } from '@/types/siteDiary';
import { ProgrammeNotFoundError, ProgrammeArchivedError, ProgrammeLockedError } from '@/errors/programmeErrors';
import {
  SiteDiaryValidationError,
  SiteDiaryNotFoundError,
  SiteDiaryRevisionNotApprovedError,
} from '@/errors/siteDiaryErrors';
import { IProgrammeRepository } from '@/repositories/IProgrammeRepository';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';
import { ProgrammeRepository } from '@/repositories/ProgrammeRepository';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { siteDiaryRepository as defaultSiteDiaryRepo } from '@/repositories/siteDiaryRepository';
import { ISiteDiaryService, CreateSiteDiaryCommand, UpdateSiteDiaryCommand } from './ISiteDiaryService';

export interface ISiteDiaryRepositoryAdapter {
  createSiteDiary(data: Omit<SiteDiary, 'site_diary_id' | 'submitted_at'> & { site_diary_id?: string; submitted_at?: string }): Promise<SiteDiary>;
  getSiteDiaryById(siteDiaryId: string): Promise<SiteDiary | null>;
  getSiteDiaryByActivityAndDate(activityId: string, activityDate: string): Promise<SiteDiary | null>;
  getSiteDiariesByActivity(activityId: string): Promise<SiteDiary[]>;
  getSiteDiariesByRevision(revisionId: string): Promise<SiteDiary[]>;
  updateSiteDiary(siteDiaryId: string, updates: Partial<SiteDiary>): Promise<SiteDiary>;
}

export interface ISiteDiaryServiceDependencies {
  readonly programmeRepository?: IProgrammeRepository;
  readonly revisionRepository?: IProgrammeRevisionRepository;
  readonly siteDiaryRepository?: ISiteDiaryRepositoryAdapter;
  readonly clock?: { nowIso(): string };
  readonly logger?: Logger;
}

export class SiteDiaryService implements ISiteDiaryService {
  private readonly programmeRepo: IProgrammeRepository;
  private readonly revisionRepo: IProgrammeRevisionRepository;
  private readonly siteDiaryRepo: ISiteDiaryRepositoryAdapter;
  private readonly clock: { nowIso(): string };
  private readonly logger: Logger;

  constructor(deps: ISiteDiaryServiceDependencies = {}) {
    this.programmeRepo = deps.programmeRepository ?? new ProgrammeRepository();
    this.revisionRepo = deps.revisionRepository ?? new ProgrammeRevisionRepository();
    this.siteDiaryRepo = deps.siteDiaryRepository ?? defaultSiteDiaryRepo;
    this.clock = deps.clock ?? new SystemClock();
    this.logger = deps.logger ?? new Logger({ module: 'SiteDiaryService' });
  }

  public async createSiteDiary(cmd: CreateSiteDiaryCommand): Promise<Result<SiteDiary, BaseAppError>> {
    try {
      // 1. Command Validation
      if (!cmd.programmeId || cmd.programmeId.trim() === '') {
        return Failure(new SiteDiaryValidationError('programmeId is required'));
      }
      if (!cmd.revisionId || cmd.revisionId.trim() === '') {
        return Failure(new SiteDiaryValidationError('revisionId is required'));
      }
      if (!cmd.activityId || cmd.activityId.trim() === '') {
        return Failure(new SiteDiaryValidationError('activityId is required'));
      }
      if (!cmd.activityDate || cmd.activityDate.trim() === '') {
        return Failure(new SiteDiaryValidationError('activityDate is required'));
      }
      if (!cmd.notes || cmd.notes.trim() === '') {
        return Failure(new SiteDiaryValidationError('notes are required'));
      }
      if (!cmd.submittedBy || cmd.submittedBy.trim() === '') {
        return Failure(new SiteDiaryValidationError('submittedBy is required'));
      }

      // 2. Programme Context Validation
      const progResult = await this.programmeRepo.findById(cmd.programmeId);
      if (isFailure(progResult)) {
        return Failure(progResult.error);
      }
      if (!progResult.value) {
        return Failure(new ProgrammeNotFoundError(`Programme not found: ${cmd.programmeId}`));
      }
      if (progResult.value.status === 'Archived') {
        return Failure(new ProgrammeArchivedError(`Cannot create Site Diary for archived programme: ${cmd.programmeId}`));
      }
      if (progResult.value.isLocked) {
        return Failure(new ProgrammeLockedError(`Programme is locked: ${cmd.programmeId}`));
      }

      // 3. Programme Revision Safety Validation (D1 Revision Safety Rule)
      const revResult = await this.revisionRepo.findById(cmd.revisionId);
      if (isFailure(revResult)) {
        return Failure(revResult.error);
      }
      const revision = revResult.value;
      if (!revision) {
        return Failure(new SiteDiaryValidationError(`Programme Revision not found: ${cmd.revisionId}`));
      }
      if (revision.programmeId !== cmd.programmeId) {
        return Failure(new SiteDiaryValidationError(`programme/revision mismatch: revision ${cmd.revisionId} does not belong to programme ${cmd.programmeId}`));
      }

      // 4. Reject Draft, UnderReview, Superseded, Archived Revisions
      if (revision.status !== 'Approved' || !revision.isCurrent) {
        this.logger.warn('Site Diary creation rejected due to revision state', {
          programmeId: cmd.programmeId,
          revisionId: cmd.revisionId,
          status: revision.status,
          isCurrent: revision.isCurrent,
        });
        return Failure(
          new SiteDiaryRevisionNotApprovedError(
            `Cannot create Site Diary under revision with status '${revision.status}' (isCurrent: ${revision.isCurrent}). Site Diary requires an active Approved revision.`
          )
        );
      }

      // 5. Create Site Diary Entity
      const now = this.clock.nowIso();
      const siteDiaryId = generateUuid();

      const created = await this.siteDiaryRepo.createSiteDiary({
        site_diary_id: siteDiaryId,
        programme_id: cmd.programmeId,
        revision_id: cmd.revisionId,
        activity_id: cmd.activityId,
        activity_date: cmd.activityDate,
        weather: cmd.weather ?? null,
        notes: cmd.notes.trim(),
        status: cmd.status ?? null,
        manpower: cmd.manpower ?? null,
        submitted_by: cmd.submittedBy,
        submitted_at: now,
        updated_at: null,
      });

      this.logger.info('Created Site Diary entry successfully', {
        siteDiaryId: created.site_diary_id,
        programmeId: cmd.programmeId,
        revisionId: cmd.revisionId,
      });

      return Success(created);
    } catch (err: unknown) {
      this.logger.error('Unexpected error creating Site Diary', { error: err });
      const msg = err instanceof Error ? err.message : 'Failed to create Site Diary';
      return Failure(new UnknownError(msg, { cause: err }));
    }
  }

  public async getSiteDiaryById(siteDiaryId: string): Promise<Result<SiteDiary | null, BaseAppError>> {
    try {
      const entry = await this.siteDiaryRepo.getSiteDiaryById(siteDiaryId);
      return Success(entry);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to get Site Diary';
      return Failure(new UnknownError(msg, { cause: err }));
    }
  }

  public async getSiteDiariesByActivity(activityId: string): Promise<Result<SiteDiary[], BaseAppError>> {
    try {
      const entries = await this.siteDiaryRepo.getSiteDiariesByActivity(activityId);
      return Success(entries);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to get Site Diaries for activity';
      return Failure(new UnknownError(msg, { cause: err }));
    }
  }

  public async getSiteDiariesByRevision(revisionId: string): Promise<Result<SiteDiary[], BaseAppError>> {
    try {
      const entries = await this.siteDiaryRepo.getSiteDiariesByRevision(revisionId);
      return Success(entries);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to get Site Diaries for revision';
      return Failure(new UnknownError(msg, { cause: err }));
    }
  }

  public async updateSiteDiary(cmd: UpdateSiteDiaryCommand): Promise<Result<SiteDiary, BaseAppError>> {
    try {
      if (!cmd.siteDiaryId || cmd.siteDiaryId.trim() === '') {
        return Failure(new SiteDiaryValidationError('siteDiaryId is required'));
      }

      const existing = await this.siteDiaryRepo.getSiteDiaryById(cmd.siteDiaryId);
      if (!existing) {
        return Failure(new SiteDiaryNotFoundError(`Site Diary not found: ${cmd.siteDiaryId}`));
      }

      // Check revision status of existing entry
      const revResult = await this.revisionRepo.findById(existing.revision_id);
      if (isFailure(revResult)) {
        return Failure(revResult.error);
      }
      const revision = revResult.value;
      if (!revision || revision.status !== 'Approved' || !revision.isCurrent) {
        return Failure(
          new SiteDiaryRevisionNotApprovedError(
            `Cannot update Site Diary belonging to ${revision ? `'${revision.status}'` : 'missing'} revision.`
          )
        );
      }

      const now = this.clock.nowIso();
      const updates: Partial<SiteDiary> = {
        updated_at: now,
      };

      if (cmd.weather !== undefined) updates.weather = cmd.weather;
      if (cmd.notes !== undefined) updates.notes = cmd.notes;
      if (cmd.status !== undefined) updates.status = cmd.status;
      if (cmd.manpower !== undefined) updates.manpower = cmd.manpower;

      const updated = await this.siteDiaryRepo.updateSiteDiary(cmd.siteDiaryId, updates);
      return Success(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update Site Diary';
      return Failure(new UnknownError(msg, { cause: err }));
    }
  }
}
