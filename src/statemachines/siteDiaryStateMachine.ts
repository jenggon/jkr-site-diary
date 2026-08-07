import { ActivityStatus } from '@/types/openActivity';
import { InvalidActivityStateError } from '@/errors/activityErrors';

const ALLOWED_ACTIVITY_TRANSITIONS: Readonly<Record<ActivityStatus, readonly ActivityStatus[]>> = Object.freeze({
  Planned: ['InProgress', 'Suspended', 'Cancelled'] as readonly ActivityStatus[],
  InProgress: ['Completed', 'Suspended', 'Cancelled'] as readonly ActivityStatus[],
  Suspended: ['InProgress', 'Completed', 'Cancelled'] as readonly ActivityStatus[],
  Completed: [] as readonly ActivityStatus[],
  Cancelled: [] as readonly ActivityStatus[],
});

export function canTransitionActivity(from: ActivityStatus, to: ActivityStatus): boolean {
  const allowed = ALLOWED_ACTIVITY_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function validateActivityStateTransition(from: ActivityStatus, to: ActivityStatus): void {
  if (from === 'Completed') {
    throw new InvalidActivityStateError('Cannot transition from Completed state; it is terminal for daily entry');
  }
  if (from === 'Cancelled') {
    throw new InvalidActivityStateError('Cannot transition from Cancelled state; it is terminal');
  }
  if (!canTransitionActivity(from, to)) {
    throw new InvalidActivityStateError(`Cannot transition activity from '${from}' to '${to}'`);
  }
}
