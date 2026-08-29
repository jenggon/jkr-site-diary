import { IOpenActivityService } from '@/services/IOpenActivityService';
import { ITreEngineService } from '@/services/ITreEngineService';
import { IKnowledgeEngineService } from '@/services/IKnowledgeEngineService';
import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';
import { IMaterialEngineService } from '@/services/IMaterialEngineService';
import { IIntelligenceOrchestratorService } from '@/services/IntelligenceOrchestratorService';
import { createOpenActivityService } from '@/composition/activityComposition';
import { createTreEngineService } from '@/composition/treComposition';
import { createKnowledgeEngineService } from '@/composition/knowledgeComposition';
import { createWorkforceEngineService } from '@/composition/wreComposition';
import { createMaterialEngineService } from '@/composition/mreComposition';
import { createIntelligenceOrchestratorService } from '@/composition/intelligenceComposition';

export interface PlatformServiceContainer {
  openActivity(): IOpenActivityService;
  treEngine(): ITreEngineService;
  knowledgeEngine(): IKnowledgeEngineService;
  workforceEngine(): IWorkforceEngineService;
  materialEngine(): IMaterialEngineService;
  intelligenceOrchestrator(): IIntelligenceOrchestratorService;
}

export class LazyPlatformServiceContainer implements PlatformServiceContainer {
  private _openActivityService?: IOpenActivityService | undefined;
  private _treEngineService?: ITreEngineService | undefined;
  private _knowledgeEngineService?: IKnowledgeEngineService | undefined;
  private _workforceEngineService?: IWorkforceEngineService | undefined;
  private _materialEngineService?: IMaterialEngineService | undefined;
  private _intelligenceOrchestratorService?: IIntelligenceOrchestratorService | undefined;

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
  public intelligenceOrchestrator(): IIntelligenceOrchestratorService {
    if (!this._intelligenceOrchestratorService) {
      this._intelligenceOrchestratorService = createIntelligenceOrchestratorService();
    }
    return this._intelligenceOrchestratorService;
  }
}