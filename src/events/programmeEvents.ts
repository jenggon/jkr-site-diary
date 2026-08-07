import { generateUuid } from '@/lib/uuid';
import { nowIso } from '@/lib/clock';
import { Programme } from '@/types/programme';
import { ProgrammeRevision } from '@/types/programmeRevision';
import { IDomainEvent } from './IDomainEventPublisher';

export class ProgrammeCreatedEvent implements IDomainEvent {
  public readonly eventId: string = generateUuid();
  public readonly eventType: string = 'PROGRAMME_CREATED';
  public readonly occurredAt: string = nowIso();
  public readonly payload: Record<string, unknown>;

  constructor(programme: Programme) {
    this.payload = {
      programmeId: programme.programmeId,
      programmeCode: programme.programmeCode,
      programmeName: programme.programmeName,
      status: programme.status,
      createdBy: programme.createdBy,
      createdAt: programme.createdAt,
    };
  }
}

export class ProgrammeRevisionApprovedEvent implements IDomainEvent {
  public readonly eventId: string = generateUuid();
  public readonly eventType: string = 'PROGRAMME_REVISION_APPROVED';
  public readonly occurredAt: string = nowIso();
  public readonly payload: Record<string, unknown>;

  constructor(revision: ProgrammeRevision) {
    this.payload = {
      revisionId: revision.revisionId,
      programmeId: revision.programmeId,
      revisionNumber: revision.revisionNumber,
      status: revision.status,
      approvedBy: revision.approvedBy ?? null,
      approvedAt: revision.approvedAt ?? null,
    };
  }
}

export class ProgrammeArchivedEvent implements IDomainEvent {
  public readonly eventId: string = generateUuid();
  public readonly eventType: string = 'PROGRAMME_ARCHIVED';
  public readonly occurredAt: string = nowIso();
  public readonly payload: Record<string, unknown>;

  constructor(programme: Programme) {
    this.payload = {
      programmeId: programme.programmeId,
      programmeCode: programme.programmeCode,
      status: programme.status,
      archivedBy: programme.archivedBy ?? null,
      archivedAt: programme.archivedAt ?? null,
    };
  }
}
