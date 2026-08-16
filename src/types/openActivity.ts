import { Activity, ActivitySourceType, ActivityStatus } from './activity';

export { ActivityStatus };

export type OpenActivity = Activity;

export interface OpenActivityDto {
  readonly activityId: string;
  readonly programmeId: string;
  readonly revisionId?: string | undefined;
  readonly sourceType: ActivitySourceType;
  readonly taskId?: string | undefined;
  readonly voItemId?: string | undefined;
  readonly ahi: string | null;
  readonly ahiDisplayName: string | null;
  readonly subtask: string;
  readonly subtaskDisplayName: string | null;
  readonly status: ActivityStatus;
  readonly isLocked: boolean;
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
