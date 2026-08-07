import { NextResponse } from 'next/server';
import { generateUuid } from '@/lib/uuid';
import { logger } from '@/lib/logger';
import { RequestContext } from '@/lib/RequestContext';
import { PlatformServiceContainer, LazyPlatformServiceContainer } from './container';
import { toErrorResponse } from './response';

export async function handleRoute(
  request: Request,
  handler: (args: { ctx: RequestContext; services: PlatformServiceContainer }) => Promise<NextResponse>
): Promise<NextResponse> {
  const requestId = generateUuid();
  const correlationId = request.headers.get('x-correlation-id') || requestId;
  const ctx: RequestContext = { requestId, correlationId };

  const childLogger = logger.child({ correlationId, requestId });
  const services = new LazyPlatformServiceContainer();

  try {
    return await handler({ ctx, services });
  } catch (error: unknown) {
    childLogger.error('Unhandled exception trapped in handleRoute', { error });
    return toErrorResponse(error, 500);
  }
}
