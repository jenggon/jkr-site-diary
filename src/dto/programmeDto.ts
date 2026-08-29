import { ProgrammeStatus } from '@/types/programme';

export interface CreateProgrammeDTO {
  readonly programmeCode: string;
  readonly programmeName: string;
  readonly employerName?: string | undefined;
  readonly contractorName?: string | undefined;
  readonly supervisingOfficer?: string | undefined;
  readonly contractStartDate?: string | undefined;
  readonly contractCompletionDate?: string | undefined;
  readonly defectLiabilityEnd?: string | undefined;
}

export interface UpdateProgrammeDTO {
  readonly programmeId: string;
  readonly programmeName?: string | undefined;
  readonly employerName?: string | undefined;
  readonly contractorName?: string | undefined;
  readonly supervisingOfficer?: string | undefined;
  readonly contractStartDate?: string | undefined;
  readonly contractCompletionDate?: string | undefined;
  readonly defectLiabilityEnd?: string | undefined;
}

export interface ArchiveProgrammeDTO {
  readonly programmeId: string;
}

export interface ProgrammeResponseDTO {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly employerName?: string | undefined;
  readonly contractorName?: string | undefined;
  readonly supervisingOfficer?: string | undefined;
  readonly status: ProgrammeStatus;
  readonly isLocked: boolean;
  readonly currentRevisionId?: string | undefined;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly archivedAt?: string | undefined;
}
