import { MaterialResolutionContext } from '@/types/mre';
import { IMaterialRuleEvaluator, MaterialEvaluationResult } from './MaterialRuleEvaluatorRegistry';
import { IMaterialRuleRepository } from '@/repositories/IMaterialRuleRepository';

export class StandardMaterialEvaluator implements IMaterialRuleEvaluator {
  public readonly discipline: string;

  constructor(
    discipline: string,
    private readonly ruleRepository: IMaterialRuleRepository
  ) {
    this.discipline = discipline;
  }

  public async evaluate(_ctx: MaterialResolutionContext): Promise<MaterialEvaluationResult | null> {
    const rules = await this.ruleRepository.findActiveRulesByDiscipline(this.discipline);
    
    if (rules.length === 0) {
      return null;
    }

    // For standard evaluation, we just map all active rules for this discipline
    // In a more complex evaluator, it would parse context against specific criteria
    const items = rules.map(rule => ({
      materialCode: rule.materialCode,
      materialName: rule.materialName,
      materialRole: rule.materialRole,
      recommendedQuantity: rule.recommendedQuantity,
      unitOfMeasure: rule.unitOfMeasure,
      isMandatory: rule.isMandatory,
      estimatedWastePercentage: rule.estimatedWastePercentage,
      estimatedCost: rule.estimatedCost,
      estimatedLeadTime: rule.estimatedLeadTime,
      constraints: [],
      substitutions: []
    }));

    return {
      items,
      ruleId: rules[0]?.ruleId ?? 'UNKNOWN', 
      ruleVersion: rules[0]?.ruleVersion ?? 1,
      reasonCode: 'STANDARD_DISCIPLINE_MATCH',
      reasonDescription: `Matched standard materials for discipline ${this.discipline}`
    };
  }
}
