import { WorkforceDiscipline, WorkforceResolutionContext, WorkforceItemRecommendation } from '@/types/wre';

export interface WorkforceEvaluationResult {
  readonly items: readonly WorkforceItemRecommendation[];
  readonly reasonCode: string;
  readonly reasonDescription: string;
  readonly ruleId?: string | undefined;
  readonly ruleVersion?: number | undefined;
}

export interface IWorkforceEvaluator {
  readonly discipline: WorkforceDiscipline;
  evaluate(ctx: WorkforceResolutionContext): Promise<WorkforceEvaluationResult | null>;
}
