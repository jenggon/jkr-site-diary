import {
  IProgramKerjaBoundaryService,
  ProgramKerjaTradeInfo,
  ProgramKerjaWorkforceInfo,
  ProgramKerjaMaterialInfo,
} from './IProgramKerjaBoundaryService';
import { IMspResourceRepository } from '@/repositories/IMspResourceRepository';
import { IMspWorkforceRepository } from '@/repositories/IMspWorkforceRepository';
import { IMspMaterialRepository } from '@/repositories/IMspMaterialRepository';
import { getTaskById } from '@/repositories/taskRepository';

export interface ProgramKerjaBoundaryServiceDependencies {
  readonly mspResourceRepository?: IMspResourceRepository | undefined;
  readonly mspWorkforceRepository?: IMspWorkforceRepository | undefined;
  readonly mspMaterialRepository?: IMspMaterialRepository | undefined;
  readonly taskRepository?: { getTaskById(taskId: string): Promise<import('@/types/task').Task | null> } | undefined;
}

/**
 * Program Kerja Boundary Service implementation.
 * Decouples operational engines (TRE, WRE, MRE) from direct raw MSP table access.
 */
export class ProgramKerjaBoundaryService implements IProgramKerjaBoundaryService {
  private readonly mspResourceRepo?: IMspResourceRepository | undefined;
  private readonly mspWorkforceRepo?: IMspWorkforceRepository | undefined;
  private readonly mspMaterialRepo?: IMspMaterialRepository | undefined;
  private readonly taskRepo: { getTaskById(taskId: string): Promise<import('@/types/task').Task | null> };

  constructor(deps: ProgramKerjaBoundaryServiceDependencies = {}) {
    this.mspResourceRepo = deps.mspResourceRepository;
    this.mspWorkforceRepo = deps.mspWorkforceRepository;
    this.mspMaterialRepo = deps.mspMaterialRepository;
    this.taskRepo = deps.taskRepository ?? { getTaskById };
  }

  public async getProgramKerjaTrade(programmeId: string, taskId: string): Promise<ProgramKerjaTradeInfo | null> {
    // Check task trade_code/trade_name first (canonical Program Kerja Task model)
    const task = await this.taskRepo.getTaskById(taskId);
    if (task && task.trade_code && task.trade_name) {
      return {
        tradeId: task.task_id,
        tradeCode: task.trade_code,
        tradeName: task.trade_name,
        tradeCategory: 'GENERAL',
      };
    }

    // Fallback to MSP resource repository if available
    if (this.mspResourceRepo) {
      const res = await this.mspResourceRepo.findResourceTradeByMspTask(programmeId, taskId);
      if (res) {
        return {
          tradeId: res.resourceId,
          tradeCode: res.tradeCode,
          tradeName: res.tradeName,
          tradeCategory: res.tradeCategory ?? undefined,
        };
      }
    }

    return null;
  }

  public async getProgramKerjaWorkforce(
    programmeId: string,
    taskId: string
  ): Promise<ProgramKerjaWorkforceInfo[] | null> {
    if (this.mspWorkforceRepo) {
      const res = await this.mspWorkforceRepo.findWorkforceByMspTask(programmeId, taskId);
      if (res && res.length > 0) {
        return res.map((item) => ({
          type: item.tradeCode ?? item.roleCode ?? 'GENERAL',
          count: item.allocatedCount ?? 1,
        }));
      }
    }
    return null;
  }

  public async getProgramKerjaMaterials(
    programmeId: string,
    taskId: string
  ): Promise<ProgramKerjaMaterialInfo[] | null> {
    if (this.mspMaterialRepo) {
      const res = await this.mspMaterialRepo.findMaterialsByMspTask(programmeId, taskId);
      if (res && res.length > 0) {
        return res.map((item) => ({
          materialCode: item.materialCode,
          materialName: item.materialName,
          quantity: item.recommendedQuantity ?? 1,
          unit: item.unitOfMeasure ?? 'UNIT',
          estimatedCost: item.estimatedCost ?? undefined,
        }));
      }
    }
    return null;
  }
}
