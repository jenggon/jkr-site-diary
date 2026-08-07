export interface IDomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: string;
  readonly payload: Record<string, unknown>;
}

export interface IDomainEventPublisher {
  publish(event: IDomainEvent): Promise<void>;
}
