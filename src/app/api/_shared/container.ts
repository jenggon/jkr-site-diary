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

export class LazyPlatformServiceContainer implements PlatformServiceContainer {
  private _openActivityService?: IOpenActivityService | undefined;
  private _treEngineService?: ITreEngineService | undefined;
  private _knowledgeEngineService?: IKnowledgeEngineService | undefined;

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
}
