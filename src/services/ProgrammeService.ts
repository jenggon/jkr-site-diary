import { Result, Success, Failure, isSuccess, isFailure } from '@/lib/result';
import { BaseAppError, UnknownError } from '@/lib/errors';
import { Logger } from '@/lib/logger';
import { IClock } from '@/lib/IClock';
import { generateUuid } from '@/lib/uuid';
import { Programme, ProgrammeStatus } from '@/types/programme';
import { ProgrammeRevision } from '@/types/programmeRevision';
import {
  ProgrammeAlreadyExistsError,
  ProgrammeNotFoundError,
  ProgrammeArchivedError,
  ProgrammeLockedError,
  ProgrammeValidationError,
} from '@/errors/programmeErrors';
import { validateProgrammeStateTransition } from '@/statemachines/programmeStateMachine';
import { validateProgrammeRevisionTransition } from '@/statemachines/programmeRevisionStateMachine';
import { validateProgrammeCode, validateProgrammeName, validateDateHierarchy } from '@/validation/programmeValidation';
import { IProgrammeRepository } from '@/repositories/IProgrammeRepository';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';
import { ITransactionManager } from '@/transactions/ITransactionManager';
import { IDomainEventPublisher } from '@/events/IDomainEventPublisher';
import { ProgrammeCreatedEvent, ProgrammeRevisionApprovedEvent, ProgrammeArchivedEvent } from '@/events/programmeEvents';
import {
  IProgrammeService,
  CreateProgrammeCommand,
  UpdateProgrammeCommand,
  CreateRevisionCommand,
} from './IProgrammeService';

export interface IProgrammeServiceDependencies {
  readonly programmeRepository: IProgrammeRepository;
  readonly revisionRepository: IProgrammeRevisionRepository;
  readonly transactionManager: ITransactionManager;
  readonly clock: IClock;
  readonly logger: Logger;
  readonly eventPublisher: IDomainEventPublisher;
}

export class ProgrammeService implements IProgrammeService {
  private readonly programmeRepo: IProgrammeRepository;
  private readonly revisionRepo: IProgrammeRevisionRepository;
  private readonly txManager: ITransactionManager;
  private readonly clock: IClock;
  private readonly logger: Logger;
  private readonly eventPublisher: IDomainEventPublisher;

  constructor(deps: IProgrammeServiceDependencies) {
    this.programmeRepo = deps.programmeRepository;
    this.revisionRepo = deps.revisionRepository;
    this.txManager = deps.transactionManager;
    this.clock = deps.clock;
    this.logger = deps.logger;
    this.eventPublisher = deps.eventPublisher;
  }

  private async publishEventSafely(event: unknown): Promise<void> {
    try {
      await this.eventPublisher.publish(event as unknown as import('@/events/IDomainEventPublisher').IDomainEvent);
    } catch (err: unknown) {
      this.logger.error('Failed to publish post-commit domain event', { error: err });
    }
  }

  public async createProgramme(cmd: CreateProgrammeCommand): Promise<Result<Programme, BaseAppError>> {
    try {
      validateProgrammeCode(cmd.programmeCode);
      validateProgrammeName(cmd.programmeName);
      validateDateHierarchy(cmd.contractStartDate, cmd.contractCompletionDate, cmd.defectLiabilityEnd);
    } catch (err: unknown) {
      if (err instanceof BaseAppError) return Failure(err);
      return Failure(new ProgrammeValidationError(err instanceof Error ? err.message : 'Validation failed'));
    }

    try {
      const existsRes = await this.programmeRepo.existsByCode(cmd.programmeCode);
      if (isFailure(existsRes)) return Failure(existsRes.error);
      if (existsRes.value) {
        return Failure(new ProgrammeAlreadyExistsError(`Programme code already exists: ${cmd.programmeCode}`));
      }

      const now = this.clock.nowIso();
      const programmeId = generateUuid();
      const revisionId = generateUuid();

      const newProgramme: Programme = {
        programmeId,
        programmeCode: cmd.programmeCode,
        programmeName: cmd.programmeName,
        employerName: cmd.employerName,
        contractorName: cmd.contractorName,
        supervisingOfficer: cmd.supervisingOfficer,
        contractStartDate: cmd.contractStartDate,
        contractCompletionDate: cmd.contractCompletionDate,
        defectLiabilityEnd: cmd.defectLiabilityEnd,
        currentRevisionId: revisionId,
        status: 'Active',
        isLocked: false,
        createdAt: now,
        createdBy: cmd.createdBy,
      };

      const baselineRevision: ProgrammeRevision = {
        revisionId,
        programmeId,
        revisionNumber: 1,
        revisionTitle: 'Baseline Revision',
        isCurrent: true,
        status: 'Draft',
        createdAt: now,
        createdBy: cmd.createdBy,
      };

      const txResult = await this.txManager.execute(async () => {
        const createProgRes = await this.programmeRepo.create(newProgramme);
        if (isFailure(createProgRes)) return Failure(createProgRes.error);

        const createRevRes = await this.revisionRepo.create(baselineRevision);
        if (isFailure(createRevRes)) return Failure(createRevRes.error);

        return Success(createProgRes.value);
      });

      if (isSuccess(txResult)) {
        await this.publishEventSafely(new ProgrammeCreatedEvent(txResult.value));
      }
      return txResult;
    } catch (err: unknown) {
      return Failure(new UnknownError(err instanceof Error ? err.message : 'Failed to create programme', { cause: err }));
    }
  }

  public async updateProgramme(cmd: UpdateProgrammeCommand): Promise<Result<Programme, BaseAppError>> {
    try {
      validateDateHierarchy(cmd.contractStartDate, cmd.contractCompletionDate, cmd.defectLiabilityEnd);
    } catch (err: unknown) {
      if (err instanceof BaseAppError) return Failure(err);
      return Failure(new ProgrammeValidationError(err instanceof Error ? err.message : 'Validation failed'));
    }

    try {
      const existingRes = await this.programmeRepo.findById(cmd.programmeId);
      if (isFailure(existingRes)) return Failure(existingRes.error);
      if (!existingRes.value) return Failure(new ProgrammeNotFoundError('Programme not found'));
      if (existingRes.value.status === 'Archived') return Failure(new ProgrammeArchivedError('Cannot update archived programme'));
      if (existingRes.value.isLocked) return Failure(new ProgrammeLockedError('Cannot update locked programme'));

      const updatedProgramme: Programme = {
        ...existingRes.value,
        programmeName: cmd.programmeName ?? existingRes.value.programmeName,
        employerName: cmd.employerName ?? existingRes.value.employerName,
        contractorName: cmd.contractorName ?? existingRes.value.contractorName,
        supervisingOfficer: cmd.supervisingOfficer ?? existingRes.value.supervisingOfficer,
        contractStartDate: cmd.contractStartDate ?? existingRes.value.contractStartDate,
        contractCompletionDate: cmd.contractCompletionDate ?? existingRes.value.contractCompletionDate,
        defectLiabilityEnd: cmd.defectLiabilityEnd ?? existingRes.value.defectLiabilityEnd,
        updatedAt: this.clock.nowIso(),
        updatedBy: cmd.updatedBy,
      };

      return this.programmeRepo.update(updatedProgramme);
    } catch (err: unknown) {
      return Failure(new UnknownError(err instanceof Error ? err.message : 'Update failed', { cause: err }));
    }
  }

  public async archiveProgramme(programmeId: string, actorId: string): Promise<Result<Programme, BaseAppError>> {
    try {
      const existingRes = await this.programmeRepo.findById(programmeId);
      if (isFailure(existingRes)) return Failure(existingRes.error);
      if (!existingRes.value) return Failure(new ProgrammeNotFoundError('Programme not found'));

      validateProgrammeStateTransition(existingRes.value.status, 'Archived');

      const archiveRes = await this.programmeRepo.archive(programmeId, actorId);
      if (isSuccess(archiveRes)) {
        await this.publishEventSafely(new ProgrammeArchivedEvent(archiveRes.value));
      }
      return archiveRes;
    } catch (err: unknown) {
      if (err instanceof BaseAppError) return Failure(err);
      return Failure(new UnknownError(err instanceof Error ? err.message : 'Archive failed', { cause: err }));
    }
  }

  public async createRevision(cmd: CreateRevisionCommand): Promise<Result<ProgrammeRevision, BaseAppError>> {
    try {
      const programmeRes = await this.programmeRepo.findById(cmd.programmeId);
      if (isFailure(programmeRes)) return Failure(programmeRes.error);
      if (!programmeRes.value) return Failure(new ProgrammeNotFoundError('Programme not found'));
      if (programmeRes.value.status === 'Archived') return Failure(new ProgrammeArchivedError('Cannot add revision to archived programme'));
      if (programmeRes.value.isLocked) return Failure(new ProgrammeLockedError('Cannot add revision to locked programme'));

      const revisionsRes = await this.revisionRepo.findByProgrammeId(cmd.programmeId);
      if (isFailure(revisionsRes)) return Failure(revisionsRes.error);
      const nextNumber = revisionsRes.value.length + 1;

      const newRevision: ProgrammeRevision = {
        revisionId: generateUuid(),
        programmeId: cmd.programmeId,
        revisionNumber: nextNumber,
        revisionTitle: cmd.revisionTitle,
        description: cmd.description,
        isCurrent: false,
        status: 'Draft',
        createdAt: this.clock.nowIso(),
        createdBy: cmd.createdBy,
      };

      return this.revisionRepo.create(newRevision);
    } catch (err: unknown) {
      return Failure(new UnknownError(err instanceof Error ? err.message : 'Create revision failed', { cause: err }));
    }
  }

  public async approveRevision(revisionId: string, actorId: string): Promise<Result<ProgrammeRevision, BaseAppError>> {
    try {
      const targetRes = await this.revisionRepo.findById(revisionId);
      if (isFailure(targetRes)) return Failure(targetRes.error);
      if (!targetRes.value) return Failure(new ProgrammeNotFoundError('Revision not found'));

      const targetRevision = targetRes.value;
      validateProgrammeRevisionTransition(targetRevision.status, 'Approved');

      const activeRes = await this.revisionRepo.findActiveRevision(targetRevision.programmeId);
      if (isFailure(activeRes)) return Failure(activeRes.error);

      const txResult = await this.txManager.execute(async () => {
        if (activeRes.value && activeRes.value.revisionId !== revisionId) {
          const supRes = await this.revisionRepo.updateStatus(activeRes.value.revisionId, 'Superseded', actorId);
          if (isFailure(supRes)) return Failure(supRes.error);
        }

        const appRes = await this.revisionRepo.updateStatus(revisionId, 'Approved', actorId);
        if (isFailure(appRes)) return Failure(appRes.error);

        const ptrRes = await this.programmeRepo.setCurrentRevision(targetRevision.programmeId, revisionId);
        if (isFailure(ptrRes)) return Failure(ptrRes.error);

        return Success(appRes.value);
      });

      if (isSuccess(txResult)) {
        await this.publishEventSafely(new ProgrammeRevisionApprovedEvent(txResult.value));
      }
      return txResult;
    } catch (err: unknown) {
      if (err instanceof BaseAppError) return Failure(err);
      return Failure(new UnknownError(err instanceof Error ? err.message : 'Approve revision failed', { cause: err }));
    }
  }

  public async lockProgramme(programmeId: string, _actorId: string): Promise<Result<void, BaseAppError>> {
    const existingRes = await this.programmeRepo.findById(programmeId);
    if (isFailure(existingRes)) return Failure(existingRes.error);
    if (!existingRes.value) return Failure(new ProgrammeNotFoundError('Programme not found'));

    return this.programmeRepo.setLockStatus(programmeId, true);
  }

  public async unlockProgramme(programmeId: string, _actorId: string): Promise<Result<void, BaseAppError>> {
    const existingRes = await this.programmeRepo.findById(programmeId);
    if (isFailure(existingRes)) return Failure(existingRes.error);
    if (!existingRes.value) return Failure(new ProgrammeNotFoundError('Programme not found'));

    return this.programmeRepo.setLockStatus(programmeId, false);
  }

  public async getProgramme(programmeId: string): Promise<Result<Programme | null, BaseAppError>> {
    return this.programmeRepo.findById(programmeId);
  }

  public async listProgrammes(params?: {
    status?: ProgrammeStatus | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<Result<Programme[], BaseAppError>> {
    return this.programmeRepo.findAll(params);
  }
}

// Prototype API Route Compatibility Export
export const programmeService = {
  createProgramme: async () => { throw new Error('Use ProgrammeService with DI'); },
  getProgrammeById: async () => null,
  updateProgramme: async () => { throw new Error('Use ProgrammeService with DI'); },
  archiveProgramme: async () => { throw new Error('Use ProgrammeService with DI'); },
  approveProgrammeRevision: async () => { throw new Error('Use ProgrammeService with DI'); },
  archiveProgrammeRevision: async () => { throw new Error('Use ProgrammeService with DI'); },
};
