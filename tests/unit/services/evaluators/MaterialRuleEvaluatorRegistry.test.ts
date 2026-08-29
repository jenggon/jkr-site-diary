import { describe, it, expect, vi } from 'vitest';
import { MaterialRuleEvaluatorRegistry, IMaterialRuleEvaluator } from '@/services/evaluators/MaterialRuleEvaluatorRegistry';

describe('MaterialRuleEvaluatorRegistry', () => {
  it('registers and retrieves evaluators by discipline deterministically', () => {
    const registry = new MaterialRuleEvaluatorRegistry();
    const evaluatorCivil = { discipline: 'CIVIL', evaluate: vi.fn() } as unknown as IMaterialRuleEvaluator;
    const evaluatorAll = { discipline: 'ALL', evaluate: vi.fn() } as unknown as IMaterialRuleEvaluator;
    const evaluatorMech = { discipline: 'MECH', evaluate: vi.fn() } as unknown as IMaterialRuleEvaluator;
    
    registry.register(evaluatorCivil);
    registry.register(evaluatorAll);
    registry.register(evaluatorMech);
    
    const civilEvaluators = registry.getEvaluatorsForDiscipline('CIVIL');
    expect(civilEvaluators.length).toBe(2);
    expect(civilEvaluators[0]).toBe(evaluatorCivil);
    expect(civilEvaluators[1]).toBe(evaluatorAll);
    
    const mechEvaluators = registry.getEvaluatorsForDiscipline('MECH');
    expect(mechEvaluators.length).toBe(2);
    expect(mechEvaluators[0]).toBe(evaluatorAll);
    expect(mechEvaluators[1]).toBe(evaluatorMech);
  });
});
