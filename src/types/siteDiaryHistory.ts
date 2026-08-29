export type SiteDiaryHistoryChangeKind = 'INITIAL' | 'FIELD' | 'WORKFORCE' | 'UNAVAILABLE';

export interface SiteDiaryHistoryChange {
  readonly kind: SiteDiaryHistoryChangeKind;
  readonly field: string;
  readonly description: string;
}

export interface SiteDiaryHistoryEvent {
  readonly logId: string;
  readonly eventType: string;
  readonly loggedAt: string;
  readonly actorLabel: string;
  readonly snapshotAvailable: boolean;
  readonly changes: SiteDiaryHistoryChange[];
}

export interface SiteDiaryHistoryDto {
  readonly siteDiaryId: string;
  readonly events: SiteDiaryHistoryEvent[];
}
