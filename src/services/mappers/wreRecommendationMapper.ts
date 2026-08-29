import { WorkforceResolution } from '@/types/wre';

/**
 * Encapsulates mapping logic from the Workforce Recommendation Engine (WRE)
 * into OpenActivity fields.
 */
export function mapWreResolutionToActivityWorkforceCount(resolution: WorkforceResolution): number {
  return resolution.recommendation.totalWorkforceCount;
}
