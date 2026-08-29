import { MspResourceTrade } from '@/types/tre';

export interface IMspResourceRepository {
  /**
   * Resolves Priority 1 source-specific MSP resource trade model for a given task.
   */
  findResourceTradeByMspTask(programmeId: string, mspTaskId: string): Promise<MspResourceTrade | null>;
}
