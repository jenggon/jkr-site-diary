import { WorkforceDiscipline } from '@/types/wre';
import { IWorkforceRuleRepository, WorkforceRuleRecord } from './IWorkforceRuleRepository';

export class WorkforceRuleRepository implements IWorkforceRuleRepository {
  public async getRulesByDiscipline(_discipline: WorkforceDiscipline): Promise<readonly WorkforceRuleRecord[]> {
    // DEV-027 placeholder implementation.
    return [];
  }
}
