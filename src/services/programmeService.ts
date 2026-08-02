import { Programme, ProgrammeRevision, ProgrammeLifecycleStatus } from '@/types/programme';
import { programmeRepository } from '@/repositories/programmeRepository';

/**
 * Programme Engine Business Service
 *
 * Specs: DB-011, DB-012
 * ADRs: ADR-004, ADR-009, ADR-010
 * Business Rules: BR-001, BR-002
 *
 * Responsible for Programme Engine business orchestration, lifecycle status assignment,
 * and audit field population. Operates strictly through programmeRepository and performs
 * no direct database or infrastructure operations.
 */

/**
 * Archive an existing Programme.
 * Populates status as Archived and records archive audit fields.
 *
 * Specs: DB-011, BR-001
 */
export async function archiveProgramme(
  programmeId: string,
  archivedBy: string
): Promise<Programme> {
  const archivedAt = new Date().toISOString();

  return programmeRepository.updateProgramme(programmeId, {
    status: ProgrammeLifecycleStatus.Archived,
    archived_at: archivedAt,
    archived_by: archivedBy,
  });
}

/**
 * NOTE
 *
 * Atomic execution is required by ADR-010.
 *
 * The Infrastructure layer is responsible for providing the
 * required atomic execution mechanism during a future
 * implementation task.
 *
 * This Service intentionally contains no infrastructure logic.
 */
export async function approveProgrammeRevision(
  revisionId: string,
  approvedBy: string,
  approvalDate: string,
  effectiveDate: string
): Promise<ProgrammeRevision> {
  const approvedAt = new Date().toISOString();

  // NOTE:
  // ADR-010 requires this business operation to execute atomically.
  // The Infrastructure layer will provide the required implementation.
  // This Service intentionally performs business orchestration only.
  return programmeRepository.updateProgrammeRevision(revisionId, {
    status: ProgrammeLifecycleStatus.Approved,
    approval_date: approvalDate,
    effective_date: effectiveDate,
    approved_at: approvedAt,
    approved_by: approvedBy,
  });
}

/**
 * Archive a single Programme Revision.
 * Populates status as Archived and records archive audit fields.
 *
 * Specs: DB-012, ADR-004, BR-002
 */
export async function archiveProgrammeRevision(
  revisionId: string,
  archivedBy: string
): Promise<ProgrammeRevision> {
  const archivedAt = new Date().toISOString();

  return programmeRepository.updateProgrammeRevision(revisionId, {
    status: ProgrammeLifecycleStatus.Archived,
    archived_at: archivedAt,
    archived_by: archivedBy,
  });
}

export const programmeService = {
  archiveProgramme,
  approveProgrammeRevision,
  archiveProgrammeRevision,
};
