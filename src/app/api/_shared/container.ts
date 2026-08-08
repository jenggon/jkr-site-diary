import { IOpenActivityService } from '@/services/IOpenActivityService';
import { ITreEngineService } from '@/services/ITreEngineService';
import { IKnowledgeEngineService } from '@/services/IKnowledgeEngineService';
import { createOpenActivityService } from '@/composition/activityComposition';
import { createTreEngineService } from '@/composition/treComposition';
import { createKnowledgeEngineService } from '@/composition/knowledgeComposition';

export interface PlatformServiceContainer {
  openActivity(): IOpenActivityService;
  treEngine(): ITreEngineService;
  knowledgeEngine(): IKnowledgeEngineService;
}

/**
 * Lazy-initializing platform service container.
 *
 * DEV-026: openActivity() injects the shared treEngine() instance
 * into createOpenActivityService() — ensuring a single TRE instance
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

  public openActivity(): IOpenActivityService {
    if (!this._openActivityService) {
      // Pass the shared TRE instance — not a new one (DEV-026 Refinement 1)
      this._openActivityService = createOpenActivityService(this.treEngine());
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
}
