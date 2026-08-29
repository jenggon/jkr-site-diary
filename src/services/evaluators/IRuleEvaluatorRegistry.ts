import { RuleCategory } from '@/types/knowledge';
import { IRuleEvaluator } from './IRuleEvaluator';

export interface IRuleEvaluatorRegistry {
  register(evaluator: IRuleEvaluator): void;
  getEvaluatorsForCategory(category: RuleCategory): readonly IRuleEvaluator[];
  getAllEvaluators(): readonly IRuleEvaluator[];
}
