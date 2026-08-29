import { IDomainEvent } from '../IDomainEventPublisher';
import { IActivityRepository } from '@/repositories/IActivityRepository';
import { Logger } from '@/lib/logger';

export interface IOpenActivityTerminationHandlerDependencies {
  readonly activityRepository: IActivityRepository;
  readonly logger?: Logger | undefined;
}

/**
 * Event handler that terminates (locks) Open Activities belonging to a superseded Programme Revision.
 * Triggered synchronously or asynchronously post-commit when a ProgrammeRevisionApprovedEvent occurs.
 *
 * Rules (M05):
 * - Preserves existing status (Planned, InProgress, Suspended).
 * - Leaves Completed and Cancelled activities untouched.
 * - Sets isLocked = true on affected activities.
 * - Does NOT migrate, copy, or delete activities.
 */
export class OpenActivityTerminationHandler {
  private readonly logger?: Logger | undefined;

  constructor(deps: IOpenActivityTerminationHandlerDependencies) {
    this.logger = deps.logger;
  }

  public async handle(event: IDomainEvent): Promise<void> {
    if (event.eventType !== 'PROGRAMME_REVISION_APPROVED') {
      return;
    }

    const previousRevisionId = (event.payload.previousRevisionId as string | null | undefined) ?? null;

    if (!previousRevisionId) {
      this.logger?.info('No previous revision ID in ProgrammeRevisionApprovedEvent; skipping activity termination');
      return;
    }

    // Under DB-003 canonical architecture, isLocked is NOT persisted on Activity (DB-014).
    // OpenActivityService.assertRevisionOperational dynamically rejects mutations for activities 
    // belonging to superseded revisions. Therefore, no physical mutation to Activity is required here.
    this.logger?.info('Activity termination logic is obsolete under DB-014; relies on dynamic revision locking.', { previousRevisionId });
  }
}
