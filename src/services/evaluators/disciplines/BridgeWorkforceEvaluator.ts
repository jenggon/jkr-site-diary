import { WorkforceDiscipline, WorkforceResolutionContext } from '@/types/wre';
import { IWorkforceEvaluator, WorkforceEvaluationResult } from '../IWorkforceEvaluator';
import { IWorkforceRuleRepository } from '@/repositories/IWorkforceRuleRepository';

export class BridgeWorkforceEvaluator implements IWorkforceEvaluator {
  public readonly discipline: WorkforceDiscipline = 'Bridge';

  constructor(_ruleRepository: IWorkforceRuleRepository) {}

  public async evaluate(_ctx: WorkforceResolutionContext): Promise<WorkforceEvaluationResult | null> {
    return null;
  }
}
