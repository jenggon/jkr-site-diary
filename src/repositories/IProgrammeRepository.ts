import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { Programme, ProgrammeStatus } from '@/types/programme';

export interface IProgrammeRepository {
  findById(id: string): Promise<Result<Programme | null, BaseAppError>>;
  findByCode(code: string): Promise<Result<Programme | null, BaseAppError>>;
  findAll(params?: {
    status?: ProgrammeStatus | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<Result<Programme[], BaseAppError>>;
  existsByCode(code: string): Promise<Result<boolean, BaseAppError>>;
  create(programme: Programme): Promise<Result<Programme, BaseAppError>>;
  update(programme: Programme): Promise<Result<Programme, BaseAppError>>;
  archive(id: string, actorId: string): Promise<Result<Programme, BaseAppError>>;
  setCurrentRevision(programmeId: string, revisionId: string): Promise<Result<void, BaseAppError>>;
  setLockStatus(programmeId: string, isLocked: boolean): Promise<Result<void, BaseAppError>>;
}
