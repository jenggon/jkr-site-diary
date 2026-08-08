import { describe, it, expect } from 'vitest';
import { WorkforceEvaluatorRegistry } from '@/services/evaluators/WorkforceEvaluatorRegistry';
import { IWorkforceEvaluator } from '@/services/evaluators/IWorkforceEvaluator';

describe('WorkforceEvaluatorRegistry', () => {
  it('preserves registration order', () => {
    const registry = new WorkforceEvaluatorRegistry();
    
    const eval1: IWorkforceEvaluator = { discipline: 'Civil', evaluate: async () => null };
    const eval2: IWorkforceEvaluator = { discipline: 'Civil', evaluate: async () => null };
    
    registry.register(eval1);
    registry.register(eval2);

    const evaluators = registry.getEvaluatorsForDiscipline('Civil');
    expect(evaluators.length).toBe(2);
    expect(evaluators[0]).toBe(eval1);
    expect(evaluators[1]).toBe(eval2);
  });

  it('filters by discipline if provided', () => {
    const registry = new WorkforceEvaluatorRegistry();
    
    const eval1: IWorkforceEvaluator = { discipline: 'Civil', evaluate: async () => null };
    const eval2: IWorkforceEvaluator = { discipline: 'Electrical', evaluate: async () => null };
    
    registry.register(eval1);
    registry.register(eval2);

    const evaluators = registry.getEvaluatorsForDiscipline('Electrical');
    expect(evaluators.length).toBe(1);
    expect(evaluators[0]).toBe(eval2);
  });

  it('returns all evaluators if no discipline provided', () => {
    const registry = new WorkforceEvaluatorRegistry();
    
    const eval1: IWorkforceEvaluator = { discipline: 'Civil', evaluate: async () => null };
    const eval2: IWorkforceEvaluator = { discipline: 'Electrical', evaluate: async () => null };
    
    registry.register(eval1);
    registry.register(eval2);

    const evaluators = registry.getEvaluatorsForDiscipline(undefined);
    expect(evaluators.length).toBe(2);
  });
});
