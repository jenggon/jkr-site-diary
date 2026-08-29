import { Result, Success, Failure, isFailure } from '@/lib/result';
import { BaseAppError, ValidationError, InfrastructureError } from '@/lib/errors';
import { Workforce } from '@/types/workforce';
import { IWorkforceService, CreateWorkforceCommand, UpdateWorkforceCommand } from './IWorkforceService';
import { ISiteDiaryRepositoryAdapter } from '@/services/siteDiaryService';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';
import { ITradeLibraryRepository } from '@/repositories/ITradeLibraryRepository';
import { ITransactionManager } from '@/transactions/ITransactionManager';
import { AuditEventType } from '@/types/audit';
import { Logger } from '@/lib/logger';
import { IClock } from '@/lib/IClock';
import { ResidualAtomicRepository } from '@/repositories/atomic/ResidualAtomicRepository';

export interface IWorkforceServiceDependencies {
  readonly siteDiaryRepository: ISiteDiaryRepositoryAdapter;
  readonly revisionRepository: IProgrammeRevisionRepository;
  readonly tradeLibraryRepository: ITradeLibraryRepository;
  readonly workforceRepository: typeof import('@/repositories/workforceRepository').workforceRepository;
  readonly auditRepository: typeof import('@/repositories/auditRepository').auditRepository;
  readonly transactionManager: ITransactionManager;
  readonly clock: IClock;
  readonly logger: Logger;
  readonly atomicRepository?: ResidualAtomicRepository;
}

export class WorkforceService implements IWorkforceService {
  private readonly siteDiaryRepo: ISiteDiaryRepositoryAdapter;
  private readonly revisionRepo: IProgrammeRevisionRepository;
  private readonly tradeLibraryRepo: ITradeLibraryRepository;
  private readonly workforceRepo: typeof import('@/repositories/workforceRepository').workforceRepository;
  private readonly auditRepo: typeof import('@/repositories/auditRepository').auditRepository;
  private readonly txManager: ITransactionManager;
  private readonly clock: IClock;
  private readonly logger: Logger;
  private readonly atomicRepo: ResidualAtomicRepository | undefined;

  constructor(deps: IWorkforceServiceDependencies) {
    this.siteDiaryRepo = deps.siteDiaryRepository;
    this.revisionRepo = deps.revisionRepository;
    this.tradeLibraryRepo = deps.tradeLibraryRepository;
    this.workforceRepo = deps.workforceRepository;
    this.auditRepo = deps.auditRepository;
    this.txManager = deps.transactionManager;
    this.clock = deps.clock;
    this.logger = deps.logger;
    this.atomicRepo = deps.atomicRepository;
  }

  private async validateContext(cmd: { activity_id: string; site_diary_id: string; revision_id: string }): Promise<Result<void, BaseAppError>> {
    const revisionRes = await this.revisionRepo.findById(cmd.revision_id);
    if (isFailure(revisionRes)) return Failure(revisionRes.error as BaseAppError);
    if (!revisionRes.value) {
      return Failure(new ValidationError(`Programme Revision not found: ${cmd.revision_id}`));
    }
    const revision = revisionRes.value;
    if (revision.status !== 'Approved' || !revision.isCurrent) {
      return Failure(new ValidationError(`Cannot create/update Workforce. Revision is not active (Approved and Current). Status: ${revision.status}`));
    }

    const siteDiary = await this.siteDiaryRepo.getSiteDiaryById(cmd.site_diary_id);
    if (!siteDiary) {
      return Failure(new ValidationError(`Site Diary not found: ${cmd.site_diary_id}`));
    }
    if (siteDiary.activity_id !== cmd.activity_id) {
      return Failure(new ValidationError(`Context mismatch: Site Diary ${cmd.site_diary_id} does not belong to Activity ${cmd.activity_id}`));
    }
    
    return Success(undefined);
  }

  public async createWorkforce(cmd: CreateWorkforceCommand): Promise<Result<Workforce, BaseAppError>> {
    try {
      const validationRes = await this.validateContext(cmd);
      if (isFailure(validationRes)) return Failure(validationRes.error);

      const trade = await this.tradeLibraryRepo.getTradeById(cmd.trade_id);
      if (!trade) {
        return Failure(new ValidationError(`Trade not found: ${cmd.trade_id}`));
      }
      if (!trade.is_active) {
        return Failure(new ValidationError(`Trade is inactive: ${cmd.trade_id}`));
      }

      const createdAt = this.clock.nowIso();
      const bumiputeraCount = cmd.bumiputera_count ?? 0;
      const nonBumiputeraCount = cmd.non_bumiputera_count ?? 0;
      const foreignCount = cmd.foreign_count ?? 0;
      const totalCount = bumiputeraCount + nonBumiputeraCount + foreignCount;

      if (bumiputeraCount < 0 || nonBumiputeraCount < 0 || foreignCount < 0) {
        return Failure(new ValidationError(`Workforce counts cannot be negative`));
      }

      if (this.atomicRepo) {
        return Success(await this.atomicRepo.createWorkforce({ ...cmd, actor_id: undefined }, cmd.actor_id));
      }

      return this.txManager.execute(async () => {
        const createdWorkforce = await this.workforceRepo.createWorkforce({
          ...cmd,
          trade_name: trade.trade_name,
          bumiputera_count: bumiputeraCount,
          non_bumiputera_count: nonBumiputeraCount,
          foreign_count: foreignCount,
          total_count: totalCount,
          created_at: createdAt,
          updated_at: null,
        });

        await this.auditRepo.createAudit({
          programme_id: createdWorkforce.programme_id,
          revision_id: createdWorkforce.revision_id,
          entity_name: 'WORKFORCE',
          entity_id: createdWorkforce.workforce_id,
          event_type: AuditEventType.Create,
          performed_by: cmd.actor_id,
          user_role: 'authenticated',
          field_name: null,
          old_value: null,
          new_value: JSON.stringify(createdWorkforce),
          change_reason: 'Workforce Creation via Engine',
          ip_address: null,
          device_information: null,
          application_version: null,
        });

        this.logger.info(`Workforce record created: ${createdWorkforce.workforce_id}`);
        return Success(createdWorkforce);
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to create workforce: ${err.message}`);
      return Failure(new InfrastructureError(err.message));
    }
  }

  public async getWorkforceById(workforceId: string): Promise<Result<Workforce | null, BaseAppError>> {
    try {
      const result = await this.workforceRepo.getWorkforceById(workforceId);
      return Success(result);
    } catch (error) {
      const err = error as Error;
      return Failure(new InfrastructureError(err.message));
    }
  }

  public async getWorkforceBySiteDiary(siteDiaryId: string): Promise<Result<Workforce[], BaseAppError>> {
    try {
      const result = await this.workforceRepo.getWorkforceBySiteDiary(siteDiaryId);
      return Success(result);
    } catch (error) {
      const err = error as Error;
      return Failure(new InfrastructureError(err.message));
    }
  }

  public async getWorkforceByActivity(activityId: string): Promise<Result<Workforce[], BaseAppError>> {
    try {
      const result = await this.workforceRepo.getWorkforceByActivity(activityId);
      return Success(result);
    } catch (error) {
      const err = error as Error;
      return Failure(new InfrastructureError(err.message));
    }
  }

  public async updateWorkforce(workforceId: string, cmd: UpdateWorkforceCommand): Promise<Result<Workforce, BaseAppError>> {
    try {
      const existing = await this.workforceRepo.getWorkforceById(workforceId);
      if (!existing) {
        return Failure(new ValidationError(`Workforce record not found: ${workforceId}`));
      }

      const validationRes = await this.validateContext({
        activity_id: existing.activity_id,
        site_diary_id: existing.site_diary_id,
        revision_id: existing.revision_id,
      });
      if (isFailure(validationRes)) return Failure(validationRes.error);

      let tradeName = existing.trade_name;
      if (cmd.trade_id && cmd.trade_id !== existing.trade_id) {
        const trade = await this.tradeLibraryRepo.getTradeById(cmd.trade_id);
        if (!trade) return Failure(new ValidationError(`Trade not found: ${cmd.trade_id}`));
        if (!trade.is_active) return Failure(new ValidationError(`Trade is inactive: ${cmd.trade_id}`));
        tradeName = trade.trade_name;
      }

      const bumiputeraCount = cmd.bumiputera_count ?? existing.bumiputera_count;
      const nonBumiputeraCount = cmd.non_bumiputera_count ?? existing.non_bumiputera_count;
      const foreignCount = cmd.foreign_count ?? existing.foreign_count;
      const totalCount = bumiputeraCount + nonBumiputeraCount + foreignCount;

      if (bumiputeraCount < 0 || nonBumiputeraCount < 0 || foreignCount < 0) {
        return Failure(new ValidationError(`Workforce counts cannot be negative`));
      }

      const updatedAt = this.clock.nowIso();

      if (this.atomicRepo) {
        return Success(await this.atomicRepo.updateWorkforce(workforceId, { ...cmd, actor_id: undefined }, cmd.actor_id));
      }

      return this.txManager.execute(async () => {
        const updatedWorkforce = await this.workforceRepo.updateWorkforce(workforceId, {
          trade_id: cmd.trade_id ?? existing.trade_id,
          trade_name: tradeName,
          bumiputera_count: bumiputeraCount,
          non_bumiputera_count: nonBumiputeraCount,
          foreign_count: foreignCount,
          total_count: totalCount,
          updated_at: updatedAt,
        });

        await this.auditRepo.createAudit({
          programme_id: updatedWorkforce.programme_id,
          revision_id: updatedWorkforce.revision_id,
          entity_name: 'WORKFORCE',
          entity_id: updatedWorkforce.workforce_id,
          event_type: AuditEventType.Update,
          performed_by: cmd.actor_id,
          user_role: 'authenticated',
          field_name: null,
          old_value: JSON.stringify(existing),
          new_value: JSON.stringify(updatedWorkforce),
          change_reason: 'Workforce Update via Engine',
          ip_address: null,
          device_information: null,
          application_version: null,
        });

        this.logger.info(`Workforce record updated: ${workforceId}`);
        return Success(updatedWorkforce);
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to update workforce: ${err.message}`);
      return Failure(new InfrastructureError(err.message));
    }
  }
}
