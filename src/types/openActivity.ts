export type ActivityStatus = 'Planned' | 'InProgress' | 'Completed' | 'Suspended' | 'Cancelled';

export type TradeSource = 'MSPResource' | 'KnowledgeEngine' | 'TradeLibrary';

export interface TradeSelection {
  readonly tradeId: string;
  readonly tradeCode: string;
  readonly tradeName: string;
  readonly source: TradeSource;
}

export interface ActivityLocation {
  readonly buildingId?: string | undefined;
  readonly floorLevel?: string | undefined;
  readonly zone?: string | undefined;
  readonly gridReference?: string | undefined;
}

export interface OpenActivity {
  readonly activityId: string;
  readonly siteDiaryId: string;
  readonly programmeId: string;
  readonly revisionId?: string | undefined;
  readonly taskId?: string | undefined;
  readonly activityName: string;
  readonly location?: ActivityLocation | undefined;
  readonly tradeInfo?: TradeSelection | undefined;
  readonly workforceCount?: number | undefined;
  readonly materialSnapshot?: import('./mre').MaterialRecommendationSnapshot | undefined;
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
  readonly siteDiaryId: string;
  readonly eventType: 'NEW' | 'UPDATE';
  readonly snapshotData: Record<string, unknown>;
  readonly loggedAt: string;
  readonly loggedBy: string;
}
