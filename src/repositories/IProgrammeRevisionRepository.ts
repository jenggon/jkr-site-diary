import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { ProgrammeRevision, ProgrammeRevisionStatus } from '@/types/programmeRevision';

export interface IProgrammeRevisionRepository {
  findById(revisionId: string): Promise<Result<ProgrammeRevision | null, BaseAppError>>;
  findByProgrammeId(programmeId: string): Promise<Result<ProgrammeRevision[], BaseAppError>>;
  findActiveRevision(programmeId: string): Promise<Result<ProgrammeRevision | null, BaseAppError>>;
  create(revision: ProgrammeRevision): Promise<Result<ProgrammeRevision, BaseAppError>>;
  updateStatus(
    revisionId: string,
    status: ProgrammeRevisionStatus,
    actorId: string
  ): Promise<Result<ProgrammeRevision, BaseAppError>>;
}
