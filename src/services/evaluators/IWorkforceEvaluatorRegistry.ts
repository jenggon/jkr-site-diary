import { WorkforceDiscipline } from '@/types/wre';
import { IWorkforceEvaluator } from './IWorkforceEvaluator';

export interface IRuleEvaluatorRegistry {
  register(evaluator: IWorkforceEvaluator): void;
  getEvaluatorsForDiscipline(discipline: WorkforceDiscipline | undefined): readonly IWorkforceEvaluator[];
}
