import { MaterialItemRecommendation } from '@/types/mre';

export interface IMspMaterialRepository {
  findMaterialsByMspTask(
    programmeId: string, 
    mspTaskId: string
  ): Promise<readonly MaterialItemRecommendation[] | null>;
}
