import { OpenActivityDto, ActivityLogEntry } from '@/types/openActivity';
import { OpenActivityResponseDto, ActivityLogEntryResponseDto } from './activity.dto';

export function mapActivityToResponseDto(activity: OpenActivityDto): OpenActivityResponseDto {
  return {
    activity_id: activity.activityId,
    programme_id: activity.programmeId,
    revision_id: activity.revisionId ?? '',
    task_id: activity.taskId ?? null,
    subtask: activity.subtask,
    status: activity.status,
    is_locked: activity.isLocked,
    created_at: activity.createdAt,
    created_by: activity.createdBy,
    updated_at: activity.updatedAt ?? null,
    updated_by: activity.updatedBy ?? null,
  };
}

export function mapActivityLogToResponseDto(log: ActivityLogEntry): ActivityLogEntryResponseDto {
  return {
    log_id: log.logId,
    activity_id: log.activityId,
    event_type: log.eventType,
    snapshot_data: log.snapshotData,
    logged_at: log.loggedAt,
    logged_by: log.loggedBy,
  };
}
