import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import {
  ProgramKerjaTradeDTO,
  ProgramKerjaWorkforceDTO,
  ProgramKerjaMaterialDTO,
} from '@/dto/programKerjaDto';

export interface IProgramKerjaBoundaryService {
  getProgramKerjaTrade(
    programmeId: string,
    revisionId: string,
    taskId: string
  ): Promise<Result<ProgramKerjaTradeDTO | null, BaseAppError>>;

  getProgramKerjaWorkforce(
    programmeId: string,
    revisionId: string,
    taskId: string
  ): Promise<Result<readonly ProgramKerjaWorkforceDTO[] | null, BaseAppError>>;

  getProgramKerjaMaterials(
    programmeId: string,
    revisionId: string,
    taskId: string
  ): Promise<Result<readonly ProgramKerjaMaterialDTO[] | null, BaseAppError>>;
}
