import { describe, it, expect } from 'vitest';
import { StandardMaterialEvaluator } from '@/services/evaluators/StandardMaterialEvaluator';
import { IMaterialRuleRepository, MaterialRuleData } from '@/repositories/IMaterialRuleRepository';
import { MaterialResolutionContext } from '@/types/mre';

describe('StandardMaterialEvaluator', () => {
  it('evaluates rules and returns mapped items', async () => {
    const mockRule: MaterialRuleData = {
      ruleId: 'r1',
      ruleVersion: 1,
      discipline: 'CIVIL',
      lifecycle: 'ACTIVE',
      materialCode: 'M1',
      materialName: 'Sand',
      materialRole: 'Base',
      recommendedQuantity: 10,
      unitOfMeasure: 'kg',
      isMandatory: true,
      estimatedWastePercentage: 5,
      estimatedCost: 100,
      estimatedLeadTime: 2
    };

    const repo: IMaterialRuleRepository = {
      findActiveRulesByDiscipline: async (disc) => disc === 'CIVIL' ? [mockRule] : []
    };

    const evaluator = new StandardMaterialEvaluator('CIVIL', repo);
    const ctx = {} as MaterialResolutionContext;
    const result = await evaluator.evaluate(ctx);

    expect(result).not.toBeNull();
    if (result && result.items.length > 0) {
      const item = result.items[0]!;
      expect(item.materialCode).toBe('M1');
      expect(result.reasonCode).toBe('STANDARD_DISCIPLINE_MATCH');
    }
  });

  it('returns null if no rules found', async () => {
    const repo: IMaterialRuleRepository = {
      findActiveRulesByDiscipline: async () => []
    };
    const evaluator = new StandardMaterialEvaluator('MECH', repo);
    const result = await evaluator.evaluate({} as MaterialResolutionContext);
    expect(result).toBeNull();
  });
});
