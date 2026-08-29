import { IDomainEventPublisher, IDomainEvent } from './IDomainEventPublisher';

export class NoopDomainEventPublisher implements IDomainEventPublisher {
  public async publish(_event: IDomainEvent): Promise<void> {
    // Intentional no-op for tests or fallback
  }
}
