import { NextResponse } from 'next/server';
import { LazyPlatformServiceContainer } from '@/app/api/_shared/container';
import { IntelligenceOrchestratorContext } from '@/services/IntelligenceOrchestratorService';
import { isFailure } from '@/lib/result';

const container = new LazyPlatformServiceContainer();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const activityId = searchParams.get('activityId') || 'transient-ui';
  const programmeId = searchParams.get('programmeId') || '';
  const revisionId = searchParams.get('revisionId') || undefined;
  const taskId = searchParams.get('taskId') || undefined;
  const activityName = searchParams.get('activityName') || '';

  if (!taskId && !activityName) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  const ctx: IntelligenceOrchestratorContext = {
    activityId,
    programmeId,
    activityName,
    ...(revisionId ? { revisionId } : {}),
    ...(taskId ? { taskId } : {}),
  };

  const orchestrator = container.intelligenceOrchestrator();
  const result = await orchestrator.resolveActivityIntelligence(ctx);

  if (isFailure(result)) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json(result.value);
}
