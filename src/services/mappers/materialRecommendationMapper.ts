import { MaterialResolution, MaterialRecommendationSnapshot } from '@/types/mre';
import { generateUuid } from '@/lib/uuid';
import { SystemClock } from '@/lib/clock';

export function toSnapshot(
  activityId: string,
  siteDiaryId: string,
  resolution: MaterialResolution
): MaterialRecommendationSnapshot {
  return {
    snapshotId: generateUuid(),
    activityId,
    siteDiaryId,
    resolutionSource: resolution.resolutionSource,
    confidenceLevel: resolution.confidenceLevel,
    items: resolution.recommendation.items,
    reasonCode: resolution.reasoning.overallReasonCode,
    reasonDescription: resolution.reasoning.overallReasonDescription,
    snapshottedAt: new SystemClock().nowIso()
  };
}

export function toDomain(): void {
  // Not used right now but mandated by the mapping conventions
}
