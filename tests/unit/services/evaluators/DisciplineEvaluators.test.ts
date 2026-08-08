import { describe, it, expect } from 'vitest';
import { SafetyWorkforceEvaluator } from '@/services/evaluators/disciplines/SafetyWorkforceEvaluator';
import { CivilWorkforceEvaluator } from '@/services/evaluators/disciplines/CivilWorkforceEvaluator';
import { WorkforceResolutionContext } from '@/types/wre';
import { IWorkforceRuleRepository } from '@/repositories/IWorkforceRuleRepository';

describe('Discipline Evaluators', () => {
  const mockRepo = { getRulesByDiscipline: async () => [] } as unknown as IWorkforceRuleRepository;

  it('SafetyWorkforceEvaluator has correct discipline and evaluates to null by default', async () => {
    const evaluator = new SafetyWorkforceEvaluator(mockRepo);
    expect(evaluator.discipline).toBe('Safety');
    const result = await evaluator.evaluate({} as unknown as WorkforceResolutionContext);
    expect(result).toBeNull();
  });

  it('CivilWorkforceEvaluator has correct discipline and evaluates to null by default', async () => {
    const evaluator = new CivilWorkforceEvaluator(mockRepo);
    expect(evaluator.discipline).toBe('Civil');
    const result = await evaluator.evaluate({} as unknown as WorkforceResolutionContext);
    expect(result).toBeNull();
  });
});
