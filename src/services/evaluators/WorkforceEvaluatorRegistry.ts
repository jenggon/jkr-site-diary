import { WorkforceDiscipline } from '@/types/wre';
import { IWorkforceEvaluator } from './IWorkforceEvaluator';
import { IRuleEvaluatorRegistry } from './IWorkforceEvaluatorRegistry';

export class WorkforceEvaluatorRegistry implements IRuleEvaluatorRegistry {
  private readonly evaluators: IWorkforceEvaluator[] = [];

  public register(evaluator: IWorkforceEvaluator): void {
    this.evaluators.push(evaluator);
  }

  public getEvaluatorsForDiscipline(discipline: WorkforceDiscipline | undefined): readonly IWorkforceEvaluator[] {
    if (!discipline) {
      return this.evaluators;
    }
    return this.evaluators.filter((e) => e.discipline === discipline);
  }
}
