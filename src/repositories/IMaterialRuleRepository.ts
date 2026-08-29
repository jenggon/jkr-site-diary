import { MaterialRuleLifecycle } from '@/types/mre';

export interface MaterialRuleData {
  readonly ruleId: string;
  readonly ruleVersion: number;
  readonly discipline: string;
  readonly lifecycle: MaterialRuleLifecycle;
  readonly materialCode: string;
  readonly materialName: string;
  readonly materialRole: string;
  readonly recommendedQuantity: number;
  readonly unitOfMeasure: string;
  readonly isMandatory: boolean;
  readonly estimatedWastePercentage: number | null;
  readonly estimatedCost: number | null;
  readonly estimatedLeadTime: number | null;
}

export interface IMaterialRuleRepository {
  findActiveRulesByDiscipline(discipline: string): Promise<readonly MaterialRuleData[]>;
}
