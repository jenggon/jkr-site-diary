import { NextRequest, NextResponse } from 'next/server';
import { SiteDiaryService } from '@/services/siteDiaryService';
import { isFailure } from '@/lib/result';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { programmeId, targetDate, actorId, activityId } = body;

    const siteDiaryService = new SiteDiaryService();

    if (activityId) {
      // Single carry-forward
      if (!targetDate || !actorId) {
        return NextResponse.json(
          { error: 'targetDate and actorId are required for single carry-forward' },
          { status: 400 }
        );
      }
      
      const result = await siteDiaryService.continueYesterday(activityId, targetDate, actorId);
      if (isFailure(result)) {
        return NextResponse.json({ error: result.error.message }, { status: result.error.httpStatus || 400 });
      }
      return NextResponse.json({ data: result.value });
    } else if (programmeId) {
      // Batch carry-forward
      if (!targetDate || !actorId) {
        return NextResponse.json(
          { error: 'targetDate and actorId are required for batch carry-forward' },
          { status: 400 }
        );
      }
      
      const result = await siteDiaryService.carryForwardActiveOperations(programmeId, targetDate, actorId);
      if (isFailure(result)) {
        return NextResponse.json({ error: result.error.message }, { status: result.error.httpStatus || 400 });
      }
      return NextResponse.json({ data: result.value });
    } else {
      return NextResponse.json(
        { error: 'Either activityId or programmeId is required' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
