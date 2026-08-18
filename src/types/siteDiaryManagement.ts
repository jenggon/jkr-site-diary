import { ActivityStatus } from '@/types/activity';
import { ProgrammeRevisionStatus } from '@/types/programmeRevision';
import { SiteDiaryContractorScope } from '@/types/siteDiary';

export type SiteDiaryManagementSourceType = 'MSP' | 'VO';

export interface SiteDiaryManagementProjection {
  readonly siteDiaryId: string;
  readonly activityId: string;
  readonly activityDate: string;
  readonly programmeId: string;
  readonly revisionId: string;
  readonly revisionNumber: number;
  readonly revisionTitle: string;
  readonly revisionStatus: ProgrammeRevisionStatus;
  readonly isCurrentRevision: boolean;
  readonly isReadOnly: boolean;
  readonly activityTitle: string | null;
  readonly activityStatus: ActivityStatus | null;
  readonly sourceType: SiteDiaryManagementSourceType | null;
  readonly sourceReference: string | null;
  readonly location: string | null;
  readonly contractorScope: SiteDiaryContractorScope | null;
  readonly diaryStatus: ActivityStatus | null;
  readonly submittedAt: string;
  readonly updatedAt: string | null;
  readonly lastModifiedAt: string;
  readonly enrichmentComplete: boolean;
}

export interface SiteDiaryManagementRevision {
  readonly programmeId: string;
  readonly revisionId: string;
  readonly revisionNumber: number;
  readonly revisionTitle: string;
  readonly revisionStatus: ProgrammeRevisionStatus;
  readonly isCurrentRevision: boolean;
  readonly isReadOnly: boolean;
}
