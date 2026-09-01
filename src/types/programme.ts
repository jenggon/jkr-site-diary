export type ProgrammeStatus = 'Active' | 'Archived';

export enum ProgrammeLifecycleStatus {
  Draft = 'Draft',
  Approved = 'Approved',
  Archived = 'Archived',
}

export interface Programme {
  readonly programmeId: string;
  readonly programmeCode: string;
  readonly programmeName: string;
  readonly programmeShortName?: string | undefined;
  readonly employerName?: string | undefined;
  readonly contractorName?: string | undefined;
  readonly supervisingOfficer?: string | undefined;
  readonly contractStartDate?: string | undefined;
  readonly contractCompletionDate?: string | undefined;
  readonly defectLiabilityEnd?: string | undefined;
  readonly currentRevisionId?: string | undefined;
  readonly status: ProgrammeStatus;
  readonly isLocked: boolean;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly updatedAt?: string | undefined;
  readonly updatedBy?: string | undefined;
  readonly archivedAt?: string | undefined;
  readonly archivedBy?: string | undefined;
}

export type { ProgrammeRevision, ProgrammeRevisionStatus } from './programmeRevision';
