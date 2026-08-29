import type { Audit, AuditEventType } from '@/types/audit';
import type { AuditReadRepository } from '@/repositories/AuditReadRepository';

export class AuditReadService {
  public constructor(private readonly repository: AuditReadRepository) {}

  public getAuditById(auditId: string): Promise<Audit | null> {
    return this.repository.getById(auditId);
  }

  public getAuditByProgramme(programmeId: string): Promise<Audit[]> {
    return this.repository.getByProgramme(programmeId);
  }

  public getAuditByEntity(entityName: string, entityId: string): Promise<Audit[]> {
    return this.repository.getByEntity(entityName, entityId);
  }

  public getAuditByUser(userId: string): Promise<Audit[]> {
    return this.repository.getByUser(userId);
  }

  public getAuditByEventType(eventType: AuditEventType): Promise<Audit[]> {
    return this.repository.getByEventType(eventType);
  }
}
