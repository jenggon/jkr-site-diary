import { IDomainEventPublisher, IDomainEvent } from './IDomainEventPublisher';

export type EventHandler<T extends IDomainEvent = IDomainEvent> = (event: T) => Promise<void> | void;

/**
 * Synchronous in-process domain event publisher.
 * Executes registered subscribers sequentially in-memory.
 */
export class SyncDomainEventPublisher implements IDomainEventPublisher {
  private readonly handlers: Map<string, EventHandler[]> = new Map();

  /**
   * Register a subscriber function for a specific event type.
   */
  public subscribe<T extends IDomainEvent = IDomainEvent>(eventType: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler as EventHandler);
    this.handlers.set(eventType, existing);
  }

  /**
   * Synchronously publish an event to all registered subscribers.
   */
  public async publish(event: IDomainEvent): Promise<void> {
    const typeHandlers = this.handlers.get(event.eventType) ?? [];
    const wildcardHandlers = this.handlers.get('*') ?? [];

    const allHandlers = [...typeHandlers, ...wildcardHandlers];

    for (const handler of allHandlers) {
      await handler(event);
    }
  }
}
