import { RuleCategory } from '@/types/knowledge';
import { IRuleEvaluator } from './IRuleEvaluator';
import { IRuleEvaluatorRegistry } from './IRuleEvaluatorRegistry';

export class RuleEvaluatorRegistry implements IRuleEvaluatorRegistry {
  private readonly evaluators: IRuleEvaluator[] = [];

  public register(evaluator: IRuleEvaluator): void {
    this.evaluators.push(evaluator);
  }

  public getEvaluatorsForCategory(category: RuleCategory): readonly IRuleEvaluator[] {
    return this.evaluators.filter((e) => e.category === category);
  }

  public getAllEvaluators(): readonly IRuleEvaluator[] {
    return [...this.evaluators];
  }
}
