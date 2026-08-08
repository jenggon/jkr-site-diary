import { Result, Success, Failure, isFailure } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { Logger } from '@/lib/logger';
import { IClock } from '@/lib/IClock';
import {
  ProgramKerjaTradeDTO,
  ProgramKerjaWorkforceDTO,
  ProgramKerjaMaterialDTO,
} from '@/dto/programKerjaDto';
import { IProgramKerjaBoundaryService } from './IProgramKerjaBoundaryService';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';
import { IMspResourceRepository } from '@/repositories/IMspResourceRepository';
import { IMspWorkforceRepository } from '@/repositories/IMspWorkforceRepository';
import { IMspMaterialRepository } from '@/repositories/IMspMaterialRepository';
import { InvalidProgramKerjaContextError } from '@/errors/programKerjaErrors';

export interface IProgramKerjaBoundaryServiceDependencies {
  readonly programmeRevisionRepository: IProgrammeRevisionRepository;
  readonly mspResourceRepository: IMspResourceRepository;
  readonly mspWorkforceRepository: IMspWorkforceRepository;
  readonly mspMaterialRepository: IMspMaterialRepository;
  readonly clock: IClock;
  readonly logger: Logger;
}

export class ProgramKerjaBoundaryService implements IProgramKerjaBoundaryService {
  private readonly revisionRepo: IProgrammeRevisionRepository;
  private readonly mspResourceRepo: IMspResourceRepository;
  private readonly mspWorkforceRepo: IMspWorkforceRepository;
  private readonly mspMaterialRepo: IMspMaterialRepository;
  private readonly clock: IClock;
  private readonly logger: Logger;

  constructor(deps: IProgramKerjaBoundaryServiceDependencies) {
    this.revisionRepo = deps.programmeRevisionRepository;
    this.mspResourceRepo = deps.mspResourceRepository;
    this.mspWorkforceRepo = deps.mspWorkforceRepository;
    this.mspMaterialRepo = deps.mspMaterialRepository;
    this.clock = deps.clock;
    this.logger = deps.logger;
  }

  public async getProgramKerjaTrade(
    programmeId: string,
    revisionId: string,
    taskId: string
  ): Promise<Result<ProgramKerjaTradeDTO | null, BaseAppError>> {
    const validResult = await this.validateActiveApprovedRevision(programmeId, revisionId, taskId);
    if (isFailure(validResult)) {
      return Failure(validResult.error);
    }
    if (!validResult.value) {
      return Success(null);
    }

    const mspResource = await this.mspResourceRepo.findResourceTradeByMspTask(programmeId, taskId);
    if (!mspResource) {
      return Success(null);
    }

    const tradeDto: ProgramKerjaTradeDTO = {
      tradeId: mspResource.resourceId,
      tradeCode: mspResource.tradeCode,
      tradeName: mspResource.tradeName,
      tradeCategory: mspResource.tradeCategory,
    };

    return Success(tradeDto);
  }

  public async getProgramKerjaWorkforce(
    programmeId: string,
    revisionId: string,
    taskId: string
  ): Promise<Result<readonly ProgramKerjaWorkforceDTO[] | null, BaseAppError>> {
    const validResult = await this.validateActiveApprovedRevision(programmeId, revisionId, taskId);
    if (isFailure(validResult)) {
      return Failure(validResult.error);
    }
    if (!validResult.value) {
      return Success(null);
    }

    const mspWorkforce = await this.mspWorkforceRepo.findWorkforceByMspTask(programmeId, taskId);
    if (!mspWorkforce || mspWorkforce.length === 0) {
      return Success(null);
    }

    const items: ProgramKerjaWorkforceDTO[] = mspWorkforce.map((w) => ({
      roleCode: w.roleCode,
      tradeId: w.tradeId,
      tradeCode: w.tradeCode,
      tradeName: w.tradeName,
      allocatedCount: w.allocatedCount,
      skillLevel: w.skillLevel,
      isMandatory: w.isMandatory,
    }));

    return Success(items);
  }

  public async getProgramKerjaMaterials(
    programmeId: string,
    revisionId: string,
    taskId: string
  ): Promise<Result<readonly ProgramKerjaMaterialDTO[] | null, BaseAppError>> {
    const validResult = await this.validateActiveApprovedRevision(programmeId, revisionId, taskId);
    if (isFailure(validResult)) {
      return Failure(validResult.error);
    }
    if (!validResult.value) {
      return Success(null);
    }

    const mspMaterials = await this.mspMaterialRepo.findMaterialsByMspTask(programmeId, taskId);
    if (!mspMaterials || mspMaterials.length === 0) {
      return Success(null);
    }

    const items: ProgramKerjaMaterialDTO[] = mspMaterials.map((m) => ({
      materialCode: m.materialCode,
      materialName: m.materialName,
      materialRole: m.materialRole,
      recommendedQuantity: m.recommendedQuantity,
      unitOfMeasure: m.unitOfMeasure,
      isMandatory: m.isMandatory,
      estimatedWastePercentage: m.estimatedWastePercentage,
      estimatedCost: m.estimatedCost,
      estimatedLeadTime: m.estimatedLeadTime,
    }));

    return Success(items);
  }

  private async validateActiveApprovedRevision(
    programmeId: string,
    revisionId: string,
    taskId: string
  ): Promise<Result<boolean, BaseAppError>> {
    if (!programmeId || !revisionId || !taskId) {
      this.logger.warn('Program Kerja boundary validation failed: missing parameter', {
        programmeId,
        revisionId,
        taskId,
        timestamp: this.clock.nowIso(),
      });
      return Failure(
        new InvalidProgramKerjaContextError(
          'programmeId, revisionId, and taskId are required for Program Kerja boundary access'
        )
      );
    }

    const revResult = await this.revisionRepo.findById(revisionId);
    if (isFailure(revResult)) {
      return Failure(revResult.error);
    }

    const revision = revResult.value;
    if (!revision) {
      this.logger.warn('Program Kerja boundary rejection: revision not found', { revisionId });
      return Success(false);
    }

    if (revision.programmeId !== programmeId) {
      this.logger.warn('Program Kerja boundary rejection: revision does not belong to programme', {
        programmeId,
        revisionId,
        actualProgrammeId: revision.programmeId,
      });
      return Success(false);
    }

    if (revision.status !== 'Approved') {
      this.logger.warn(
        'Program Kerja boundary rejection: revision status is not Approved',
        {
          programmeId,
          revisionId,
          status: revision.status,
        }
      );
      return Success(false);
    }

    return Success(true);
  }
}
