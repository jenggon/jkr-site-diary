import { WorkforceDiscipline } from '@/types/wre';

export interface WorkforceRuleRecord {
  readonly ruleId: string;
  readonly ruleVersion: number;
  readonly discipline: WorkforceDiscipline;
  readonly roleCode: string;
  readonly recommendedCount: number;
  readonly isMandatory: boolean;
}

export interface IWorkforceRuleRepository {
  getRulesByDiscipline(discipline: WorkforceDiscipline): Promise<readonly WorkforceRuleRecord[]>;
}
