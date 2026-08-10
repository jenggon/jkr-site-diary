import { Activity, ActivityStatus } from './activity';

// Re-export the canonical ActivityStatus so consumers don't break if they import it from here.
export { ActivityStatus };

/**
 * OpenActivity acts as a domain concept alias for the canonical DB-014 Activity.
 * It is NOT a separate persistence entity.
 */
export type OpenActivity = Activity;

/**
 * OpenActivityDto is the API projection aggregate.
 * It strictly projects the canonical physical state without claiming fake administrative states.
 */
export interface OpenActivityDto {
  readonly activityId: string;
  readonly programmeId: string;
  readonly revisionId?: string | undefined;
  readonly taskId?: string | undefined;
  readonly subtask: string;
  readonly status: ActivityStatus;
  readonly isLocked: boolean; // Derived projection
  readonly createdAt: string;
  readonly createdBy: string;
  readonly updatedAt?: string | undefined;
  readonly updatedBy?: string | undefined;
}

export interface ActivityLogEntry {
  readonly logId: string;
  readonly activityId: string;
  readonly eventType: 'NEW' | 'UPDATE';
  readonly snapshotData: Record<string, unknown>;
  readonly loggedAt: string;
  readonly loggedBy: string;
}
