import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { Programme, ProgrammeStatus } from '@/types/programme';
import { ProgrammeRevision } from '@/types/programmeRevision';

export interface CreateProgrammeCommand {
  readonly programmeCode: string;
  readonly programmeName: string;
  readonly employerName?: string | undefined;
  readonly contractorName?: string | undefined;
  readonly supervisingOfficer?: string | undefined;
  readonly contractStartDate?: string | undefined;
  readonly contractCompletionDate?: string | undefined;
  readonly defectLiabilityEnd?: string | undefined;
  readonly createdBy: string;
}

export interface UpdateProgrammeCommand {
  readonly programmeId: string;
  readonly programmeName?: string | undefined;
  readonly employerName?: string | undefined;
  readonly contractorName?: string | undefined;
  readonly supervisingOfficer?: string | undefined;
  readonly contractStartDate?: string | undefined;
  readonly contractCompletionDate?: string | undefined;
  readonly defectLiabilityEnd?: string | undefined;
  readonly updatedBy: string;
}

export interface CreateRevisionCommand {
  readonly programmeId: string;
  readonly revisionTitle: string;
  readonly description?: string | undefined;
  readonly createdBy: string;
}

export interface IProgrammeService {
  createProgramme(cmd: CreateProgrammeCommand): Promise<Result<Programme, BaseAppError>>;
  updateProgramme(cmd: UpdateProgrammeCommand): Promise<Result<Programme, BaseAppError>>;
  archiveProgramme(programmeId: string, actorId: string): Promise<Result<Programme, BaseAppError>>;
  createRevision(cmd: CreateRevisionCommand): Promise<Result<ProgrammeRevision, BaseAppError>>;
  approveRevision(revisionId: string, actorId: string): Promise<Result<ProgrammeRevision, BaseAppError>>;
  lockProgramme(programmeId: string, actorId: string): Promise<Result<void, BaseAppError>>;
  unlockProgramme(programmeId: string, actorId: string): Promise<Result<void, BaseAppError>>;
  getProgramme(programmeId: string): Promise<Result<Programme | null, BaseAppError>>;
  listProgrammes(params?: {
    status?: ProgrammeStatus | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<Result<Programme[], BaseAppError>>;
}
