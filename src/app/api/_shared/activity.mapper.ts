import { OpenActivity, ActivityLogEntry } from '@/types/openActivity';
import { OpenActivityResponseDto, ActivityLogEntryResponseDto } from './activity.dto';

export function mapActivityToResponseDto(activity: OpenActivity): OpenActivityResponseDto {
  return {
    activity_id: activity.activityId,
    site_diary_id: activity.siteDiaryId,
    programme_id: activity.programmeId,
    task_id: activity.taskId ?? null,
    activity_name: activity.activityName,
    location: activity.location
      ? {
          building_id: activity.location.buildingId ?? null,
          floor_level: activity.location.floorLevel ?? null,
          zone: activity.location.zone ?? null,
          grid_reference: activity.location.gridReference ?? null,
        }
      : null,
    trade_info: activity.tradeInfo
      ? {
          trade_id: activity.tradeInfo.tradeId,
          trade_code: activity.tradeInfo.tradeCode,
          trade_name: activity.tradeInfo.tradeName,
          source: activity.tradeInfo.source,
        }
      : null,
    workforce_count: activity.workforceCount ?? null,
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
    site_diary_id: log.siteDiaryId,
    event_type: log.eventType,
    snapshot_data: log.snapshotData,
    logged_at: log.loggedAt,
    logged_by: log.loggedBy,
  };
}
