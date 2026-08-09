import { IDomainEvent } from '../IDomainEventPublisher';
import { IOpenActivityRepository } from '@/repositories/IOpenActivityRepository';
import { isSuccess } from '@/lib/result';
import { Logger } from '@/lib/logger';

export interface IOpenActivityTerminationHandlerDependencies {
  readonly activityRepository: IOpenActivityRepository;
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
  private readonly activityRepo: IOpenActivityRepository;
  private readonly logger?: Logger | undefined;

  constructor(deps: IOpenActivityTerminationHandlerDependencies) {
    this.activityRepo = deps.activityRepository;
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

    const findRes = await this.activityRepo.findByRevisionId(previousRevisionId);
    if (!isSuccess(findRes)) {
      this.logger?.error('Failed to query open activities for previous revision', {
        previousRevisionId,
        error: findRes.error,
      });
      return;
    }

    const activities = findRes.value;
    for (const activity of activities) {
      // Do not touch Completed or Cancelled activities
      if (activity.status === 'Completed' || activity.status === 'Cancelled') {
        continue;
      }

      // Lock active/open activities as-is without changing status
      if (!activity.isLocked) {
        const lockedActivity = {
          ...activity,
          isLocked: true,
        };
        const updateRes = await this.activityRepo.update(lockedActivity);
        if (!isSuccess(updateRes)) {
          this.logger?.error('Failed to lock open activity on revision supersession', {
            activityId: activity.activityId,
            error: updateRes.error,
          });
        }
      }
    }
  }
}
