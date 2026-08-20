import { ActivityStatus, ActivityWeather } from '@/types/activity';
import { SiteDiaryContractorScope, SiteDiaryWeatherCondition } from '@/types/siteDiary';

export interface SiteDiaryPrintManpowerItem {
  readonly tradeName: string;
  readonly bumiCount: number;
  readonly nonBumiCount: number;
  readonly foreignCount: number;
}

export interface SiteDiaryPrintContextDto {
  readonly location: string;
  readonly workStartTime: string | null;
  readonly workEndTime: string | null;
  readonly weatherCondition: SiteDiaryWeatherCondition | null;
  readonly rainStartTime: string | null;
  readonly rainEndTime: string | null;
  readonly contractorScope: SiteDiaryContractorScope;
}

export interface SiteDiaryPrintApprovalDto {
  readonly approvalId: string;
  readonly approvalStatus: string;
  readonly approvalDate: string | null;
  readonly approvedBy: string | null;
  readonly approvalComment: string | null;
}

export interface SiteDiaryPrintDto {
  readonly siteDiaryId: string;
  readonly activityId: string;
  readonly programmeId: string;
  readonly programmeName: string;
  readonly programmeCode: string;
  readonly revisionId: string;
  readonly revisionNumber: number;
  readonly revisionTitle: string;
  readonly revisionStatus: string;
  readonly isCurrentRevision: boolean;
  readonly isHistorical: boolean;
  readonly activityDate: string;
  readonly diaryStatus: ActivityStatus | null;
  readonly activityStatus: ActivityStatus | null;
  readonly sourceType: 'MSP' | 'VO';
  readonly wbs: string;
  readonly taskName: string;
  readonly isCritical: boolean;
  readonly weather: ActivityWeather | null;
  readonly notes: string;
  readonly printContext: SiteDiaryPrintContextDto;
  readonly manpower: SiteDiaryPrintManpowerItem[];
  readonly submittedBy: string;
  readonly submittedAt: string;
  readonly updatedAt: string | null;
  readonly approval?: SiteDiaryPrintApprovalDto | null;
}
