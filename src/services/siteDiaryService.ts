import { Result, Success, Failure, isFailure, isSuccess } from '@/lib/result';
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
import { IActivityRepository } from '@/repositories/IActivityRepository';
import { ActivityRepository } from '@/repositories/ActivityRepository';
import { siteDiaryRepository as defaultSiteDiaryRepo } from '@/repositories/siteDiaryRepository';
import { ISiteDiaryService, CreateSiteDiaryCommand, UpdateSiteDiaryCommand } from './ISiteDiaryService';
import { ActivityStatus, Activity } from '@/types/activity';
import { validateSiteDiaryStateTransition } from '@/statemachines/siteDiaryStateMachine';

export interface ISiteDiaryRepositoryAdapter {
  createSiteDiary(data: Omit<SiteDiary, 'site_diary_id' | 'submitted_at'> & { site_diary_id?: string; submitted_at?: string }): Promise<SiteDiary>;
  getSiteDiaryById(siteDiaryId: string): Promise<SiteDiary | null>;
  getSiteDiaryByActivityAndDate(activityId: string, activityDate: string): Promise<SiteDiary | null>;
  getSiteDiariesByActivity(activityId: string): Promise<SiteDiary[]>;
  getLatestSiteDiaryByActivity(activityId: string): Promise<SiteDiary | null>;
  getSiteDiariesByRevision(revisionId: string): Promise<SiteDiary[]>;
  updateSiteDiary(siteDiaryId: string, updates: Partial<SiteDiary>): Promise<SiteDiary>;
}

export interface ISiteDiaryServiceDependencies {
  readonly programmeRepository?: IProgrammeRepository;
  readonly revisionRepository?: IProgrammeRevisionRepository;
  readonly siteDiaryRepository?: ISiteDiaryRepositoryAdapter;
  readonly activityRepository?: IActivityRepository;
  readonly clock?: { nowIso(): string };
  readonly logger?: Logger;
}

export class SiteDiaryService implements ISiteDiaryService {
  private readonly programmeRepo: IProgrammeRepository;
  private readonly revisionRepo: IProgrammeRevisionRepository;
  private readonly siteDiaryRepo: ISiteDiaryRepositoryAdapter;
  private readonly activityRepo: IActivityRepository;
  private readonly clock: { nowIso(): string };
  private readonly logger: Logger;

  constructor(deps: ISiteDiaryServiceDependencies = {}) {
    this.programmeRepo = deps.programmeRepository ?? new ProgrammeRepository();
    this.revisionRepo = deps.revisionRepository ?? new ProgrammeRevisionRepository();
    this.siteDiaryRepo = deps.siteDiaryRepository ?? defaultSiteDiaryRepo;
    this.activityRepo = deps.activityRepository ?? new ActivityRepository();
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
      if (cmd.status !== undefined) {
        if (cmd.status !== null) {
          const fromStatus = existing.status ?? ActivityStatus.New;
          try {
            validateSiteDiaryStateTransition(fromStatus, cmd.status);
          } catch (e: unknown) {
            return Failure(e instanceof BaseAppError ? e : new UnknownError(String(e), { cause: e }));
          }
        }
        updates.status = cmd.status;
      }
      if (cmd.manpower !== undefined) updates.manpower = cmd.manpower;

      const updated = await this.siteDiaryRepo.updateSiteDiary(cmd.siteDiaryId, updates);
      return Success(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update Site Diary';
      return Failure(new UnknownError(msg, { cause: err }));
    }
  }

  public async continueYesterday(activityId: string, targetDate: string, actorId: string): Promise<Result<SiteDiary, BaseAppError>> {
    try {
      const activityResult = await this.activityRepo.findById(activityId);
      if (isFailure(activityResult)) {
        return Failure(activityResult.error);
      }
      const activity = activityResult.value;
      if (!activity) {
        return Failure(new SiteDiaryValidationError(`Activity not found: ${activityId}`));
      }

      if (activity.status === ActivityStatus.Completed) {
        return Failure(new SiteDiaryValidationError('Cannot carry forward a Completed activity'));
      }

      const revResult = await this.revisionRepo.findById(activity.revision_id);
      if (isFailure(revResult)) {
        return Failure(revResult.error);
      }
      const revision = revResult.value;
      if (!revision || revision.status !== 'Approved' || !revision.isCurrent) {
        return Failure(
          new SiteDiaryRevisionNotApprovedError(
            `Cannot carry forward activity under superseded/missing revision.`
          )
        );
      }

      const existingDiary = await this.siteDiaryRepo.getSiteDiaryByActivityAndDate(activityId, targetDate);
      if (existingDiary) {
        return Success(existingDiary);
      }

      const latestDiary = await this.siteDiaryRepo.getLatestSiteDiaryByActivity(activityId);

      const siteDiaryId = generateUuid();
      const created = await this.siteDiaryRepo.createSiteDiary({
        site_diary_id: siteDiaryId,
        programme_id: activity.programme_id,
        revision_id: activity.revision_id,
        activity_id: activity.activity_id,
        activity_date: targetDate,
        weather: null,
        notes: '',
        status: activity.status,
        manpower: latestDiary?.manpower ?? null,
        submitted_by: actorId,
        submitted_at: this.clock.nowIso(),
        updated_at: null,
      });

      return Success(created);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to carry forward activity';
      return Failure(new UnknownError(msg, { cause: err }));
    }
  }

  public async carryForwardActiveOperations(programmeId: string, targetDate: string, actorId: string): Promise<Result<SiteDiary[], BaseAppError>> {
    try {
      const activeRevResult = await this.revisionRepo.findActiveRevision(programmeId);
      if (isFailure(activeRevResult)) return Failure(activeRevResult.error);
      const activeRev = activeRevResult.value;
      if (!activeRev) return Failure(new SiteDiaryValidationError('No active revision found for programme'));

      const activitiesResult = await this.activityRepo.findByRevisionId(activeRev.revisionId);
      if (isFailure(activitiesResult)) return Failure(activitiesResult.error);
      
      const activeActivities = activitiesResult.value.filter((a: Activity) => a.status !== ActivityStatus.Completed);
      
      const results: SiteDiary[] = [];
      for (const activity of activeActivities) {
        const result = await this.continueYesterday(activity.activity_id, targetDate, actorId);
        if (isSuccess(result)) {
          results.push(result.value);
        } else if (result.error instanceof SiteDiaryRevisionNotApprovedError) {
          // Cross-revision forbidden, ignore
        } else {
           // Other error - we might want to log it
           this.logger.warn(`Failed to carry forward activity ${activity.activity_id}`, { error: result.error });
        }
      }
      return Success(results);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to carry forward active operations';
      return Failure(new UnknownError(msg, { cause: err }));
    }
  }
}
