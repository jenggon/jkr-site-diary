import { ActivityStatus } from '@/types/activity';
import { InvalidSiteDiaryStateError } from '@/errors/siteDiaryErrors';
import { InvalidActivityStateError } from '@/errors/activityErrors';

const ALLOWED_ACTIVITY_TRANSITIONS: Readonly<Record<ActivityStatus, readonly ActivityStatus[]>> = Object.freeze({
  [ActivityStatus.New]: [ActivityStatus.InProgress],
  [ActivityStatus.InProgress]: [ActivityStatus.Completed],
  [ActivityStatus.Completed]: [],
});

export function canTransitionActivity(from: ActivityStatus, to: ActivityStatus): boolean {
  const allowed = ALLOWED_ACTIVITY_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function validateActivityStateTransition(from: ActivityStatus, to: ActivityStatus): void {
  if (from === ActivityStatus.Completed) {
    throw new InvalidActivityStateError('Cannot transition from Completed state; it is terminal for daily entry');
  }
  if (!canTransitionActivity(from, to)) {
    throw new InvalidActivityStateError(`Cannot transition activity from '${from}' to '${to}'`);
  }
}

/**
 * DB-015 / REM-007 Rules:
 * Site Diary is an immutable daily historical snapshot of Activity status.
 * It does not have an independent state machine.
 * Site Diary status MUST exactly reflect the parent Activity operational status at creation time.
 */
export function validateSiteDiaryStatusConsistency(activityStatus: ActivityStatus, siteDiaryStatus: ActivityStatus | null): void {
  if (siteDiaryStatus !== null && siteDiaryStatus !== activityStatus) {
    throw new InvalidSiteDiaryStateError(`Site Diary snapshot status '${siteDiaryStatus}' does not match authoritative Activity status '${activityStatus}'`);
  }
}
