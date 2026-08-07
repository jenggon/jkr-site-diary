import { generateUuid } from '@/lib/uuid';
import { nowIso } from '@/lib/clock';
import { OpenActivity, ActivityStatus } from '@/types/openActivity';
import { IDomainEvent } from './IDomainEventPublisher';

export class ActivityCreatedEvent implements IDomainEvent {
  public readonly eventId: string = generateUuid();
  public readonly eventType: string = 'ACTIVITY_CREATED';
  public readonly occurredAt: string = nowIso();
  public readonly payload: Record<string, unknown>;

  constructor(activity: OpenActivity) {
    this.payload = {
      activityId: activity.activityId,
      siteDiaryId: activity.siteDiaryId,
      programmeId: activity.programmeId,
      activityName: activity.activityName,
      status: activity.status,
      createdBy: activity.createdBy,
      createdAt: activity.createdAt,
    };
  }
}

export class ActivityUpdatedEvent implements IDomainEvent {
  public readonly eventId: string = generateUuid();
  public readonly eventType: string = 'ACTIVITY_UPDATED';
  public readonly occurredAt: string = nowIso();
  public readonly payload: Record<string, unknown>;

  constructor(activity: OpenActivity) {
    this.payload = {
      activityId: activity.activityId,
      siteDiaryId: activity.siteDiaryId,
      activityName: activity.activityName,
      status: activity.status,
      updatedBy: activity.updatedBy ?? null,
      updatedAt: activity.updatedAt ?? null,
    };
  }
}

export class ActivityStatusChangedEvent implements IDomainEvent {
  public readonly eventId: string = generateUuid();
  public readonly eventType: string = 'ACTIVITY_STATUS_CHANGED';
  public readonly occurredAt: string = nowIso();
  public readonly payload: Record<string, unknown>;

  constructor(activityId: string, fromStatus: ActivityStatus, toStatus: ActivityStatus, actorId: string) {
    this.payload = {
      activityId,
      fromStatus,
      toStatus,
      changedBy: actorId,
    };
  }
}
