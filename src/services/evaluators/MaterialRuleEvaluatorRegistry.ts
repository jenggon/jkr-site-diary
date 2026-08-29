import { MaterialResolutionContext, MaterialItemRecommendation } from '@/types/mre';

export interface MaterialEvaluationResult {
  readonly items: readonly MaterialItemRecommendation[];
  readonly ruleId: string;
  readonly ruleVersion: number;
  readonly reasonCode: string;
  readonly reasonDescription: string;
}

export interface IMaterialRuleEvaluator {
  readonly discipline: string | 'ALL';
  evaluate(ctx: MaterialResolutionContext): Promise<MaterialEvaluationResult | null>;
}

export interface IMaterialRuleEvaluatorRegistry {
  getEvaluatorsForDiscipline(discipline: string | undefined): readonly IMaterialRuleEvaluator[];
}

export class MaterialRuleEvaluatorRegistry implements IMaterialRuleEvaluatorRegistry {
  private evaluators: IMaterialRuleEvaluator[] = [];

  public register(evaluator: IMaterialRuleEvaluator): void {
    this.evaluators.push(evaluator);
  }

  public getEvaluatorsForDiscipline(discipline: string | undefined): readonly IMaterialRuleEvaluator[] {
    return this.evaluators.filter(e => e.discipline === 'ALL' || e.discipline === discipline);
  }
}
