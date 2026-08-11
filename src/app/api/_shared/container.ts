import { IOpenActivityService } from '@/services/IOpenActivityService';
import { ITreEngineService } from '@/services/ITreEngineService';
import { IKnowledgeEngineService } from '@/services/IKnowledgeEngineService';
import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';
import { IMaterialEngineService } from '@/services/IMaterialEngineService';
import { createOpenActivityService } from '@/composition/activityComposition';
import { createTreEngineService } from '@/composition/treComposition';
import { createKnowledgeEngineService } from '@/composition/knowledgeComposition';
import { createWorkforceEngineService } from '@/composition/wreComposition';
import { createMaterialEngineService } from '@/composition/mreComposition';

export interface PlatformServiceContainer {
  openActivity(): IOpenActivityService;
  treEngine(): ITreEngineService;
  knowledgeEngine(): IKnowledgeEngineService;
  workforceEngine(): IWorkforceEngineService;
  materialEngine(): IMaterialEngineService;
}

/**
 * Lazy-initializing platform service container.
 *
 * DEV-026: openActivity() injects the shared treEngine() instance
 * into createOpenActivityService() â€” ensuring a single TRE instance
 * is shared across the container lifetime (Refinement 1).
 *
 * Initialization order is safe: TreEngineService has zero dependency
 * on OpenActivityService, so calling this.treEngine() inside openActivity()
 * carries no circular dependency risk.
 */
export class LazyPlatformServiceContainer implements PlatformServiceContainer {
  private _openActivityService?: IOpenActivityService | undefined;
  private _treEngineService?: ITreEngineService | undefined;
  private _knowledgeEngineService?: IKnowledgeEngineService | undefined;
  private _workforceEngineService?: IWorkforceEngineService | undefined;
  private _materialEngineService?: IMaterialEngineService | undefined;

  public openActivity(): IOpenActivityService {
    if (!this._openActivityService) {
      this._openActivityService = createOpenActivityService();
    }
    return this._openActivityService;
  }

  public treEngine(): ITreEngineService {
    if (!this._treEngineService) {
      this._treEngineService = createTreEngineService();
    }
    return this._treEngineService;
  }

  public knowledgeEngine(): IKnowledgeEngineService {
    if (!this._knowledgeEngineService) {
      this._knowledgeEngineService = createKnowledgeEngineService();
    }
    return this._knowledgeEngineService;
  }

  public workforceEngine(): IWorkforceEngineService {
    if (!this._workforceEngineService) {
      this._workforceEngineService = createWorkforceEngineService();
    }
    return this._workforceEngineService;
  }
  public materialEngine(): IMaterialEngineService {
    if (!this._materialEngineService) {
      this._materialEngineService = createMaterialEngineService();
    }
    return this._materialEngineService;
  }
}