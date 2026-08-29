export interface RequestContext {
  readonly requestId: string;
  readonly correlationId: string;
  readonly userId?: string | undefined;
  readonly tenantId?: string | undefined;
  readonly traceId?: string | undefined;
}
