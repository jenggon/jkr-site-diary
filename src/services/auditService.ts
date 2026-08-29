import { Audit, AuditEventType } from '@/types/audit';
import { auditRepository } from '@/repositories/auditRepository';

/**
 * Audit Engine Business Service
 *
 * Specs: DB-021 (audit)
 * ADRs: ADR-009, ADR-010
 * Domain Models: DM-010
 *
 * Responsible for Audit Engine business orchestration and event_timestamp population.
 * Operates strictly through auditRepository and performs no direct database or infrastructure operations.
 */

/**
 * Create a new Audit event log record.
 * Populates event_timestamp audit metadata before persistence.
 *
 * Specs: DB-021
 */
export async function createAudit(
  data: Omit<Audit, 'audit_id' | 'event_timestamp'> & {
    audit_id?: string;
    event_timestamp?: string;
  }
): Promise<Audit> {
  const eventTimestamp = data.event_timestamp || new Date().toISOString();

  return auditRepository.createAudit({
    ...data,
    event_timestamp: eventTimestamp,
  });
}

/**
 * Retrieve an Audit log record by its ID.
 * Delegates persistence to auditRepository.
 *
 * Specs: DB-021
 */
export async function getAuditById(auditId: string): Promise<Audit | null> {
  return auditRepository.getAuditById(auditId);
}

/**
 * Retrieve all Audit log records belonging to a Programme.
 * Delegates persistence to auditRepository.
 *
 * Specs: DB-021
 */
export async function getAuditByProgramme(programmeId: string): Promise<Audit[]> {
  return auditRepository.getAuditByProgramme(programmeId);
}

/**
 * Retrieve all Audit log records for a specific entity.
 * Delegates persistence to auditRepository.
 *
 * Specs: DB-021
 */
export async function getAuditByEntity(entityName: string, entityId: string): Promise<Audit[]> {
  return auditRepository.getAuditByEntity(entityName, entityId);
}

/**
 * Retrieve all Audit log records performed by a specific user.
 * Delegates persistence to auditRepository.
 *
 * Specs: DB-021
 */
export async function getAuditByUser(userId: string): Promise<Audit[]> {
  return auditRepository.getAuditByUser(userId);
}

/**
 * Retrieve all Audit log records filtered by event type.
 * Delegates persistence to auditRepository.
 *
 * Specs: DB-021
 */
export async function getAuditByEventType(eventType: AuditEventType): Promise<Audit[]> {
  return auditRepository.getAuditByEventType(eventType);
}

/**
 * NOTE
 *
 * Atomic execution is required by ADR-010 where business operations require it.
 *
 * The Infrastructure layer is responsible for providing the
 * required atomic execution mechanism during a future
 * implementation task.
 *
 * This Service intentionally contains no infrastructure logic.
 */
export async function updateAudit(
  auditId: string,
  updates: Partial<Audit>
): Promise<Audit> {
  // NOTE:
  // ADR-010 requires this business operation to execute atomically.
  // The Infrastructure layer will provide the required implementation.
  // This Service intentionally performs business orchestration only.
  return auditRepository.updateAudit(auditId, updates);
}

export const auditService = {
  createAudit,
  getAuditById,
  getAuditByProgramme,
  getAuditByEntity,
  getAuditByUser,
  getAuditByEventType,
  updateAudit,
};
