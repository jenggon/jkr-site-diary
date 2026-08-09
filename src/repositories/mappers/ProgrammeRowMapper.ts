import { Programme } from '@/types/programme';
import { ProgrammeRevision } from '@/types/programmeRevision';
import { ProgrammeRow, ProgrammeRevisionRow } from '../types/programmeRow';
import { IProgrammeRowMapper } from './IProgrammeRowMapper';

export class ProgrammeRowMapper implements IProgrammeRowMapper {
  public toDomain(row: ProgrammeRow): Programme {
    return {
      programmeId: row.programme_id,
      programmeCode: row.programme_code,
      programmeName: row.programme_name,
      employerName: row.employer_name ?? undefined,
      contractorName: row.contractor_name ?? undefined,
      supervisingOfficer: row.supervising_officer ?? undefined,
      contractStartDate: row.contract_start_date ?? undefined,
      contractCompletionDate: row.contract_completion_date ?? undefined,
      defectLiabilityEnd: row.defect_liability_end ?? undefined,
      currentRevisionId: row.current_revision_id ?? undefined,
      status: row.status,
      isLocked: row.is_locked,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at ?? undefined,
      updatedBy: row.updated_by ?? undefined,
      archivedAt: row.archived_at ?? undefined,
      archivedBy: row.archived_by ?? undefined,
    };
  }

  public toRow(entity: Programme): ProgrammeRow {
    return {
      programme_id: entity.programmeId,
      programme_code: entity.programmeCode,
      programme_name: entity.programmeName,
      employer_name: entity.employerName ?? null,
      contractor_name: entity.contractorName ?? null,
      supervising_officer: entity.supervisingOfficer ?? null,
      contract_start_date: entity.contractStartDate ?? null,
      contract_completion_date: entity.contractCompletionDate ?? null,
      defect_liability_end: entity.defectLiabilityEnd ?? null,
      current_revision_id: entity.currentRevisionId ?? null,
      status: entity.status,
      is_locked: entity.isLocked,
      created_at: entity.createdAt,
      created_by: entity.createdBy,
      updated_at: entity.updatedAt ?? null,
      updated_by: entity.updatedBy ?? null,
      archived_at: entity.archivedAt ?? null,
      archived_by: entity.archivedBy ?? null,
    };
  }

  public toRevisionDomain(row: ProgrammeRevisionRow): ProgrammeRevision {
    return {
      revisionId: row.revision_id,
      programmeId: row.programme_id,
      revisionNumber: row.revision_number,
      revisionTitle: row.revision_title,
      isCurrent: row.is_current,
      status: row.status,
      msp_file_name: row.msp_file_name ?? undefined,
      msp_file_hash: row.msp_file_hash ?? undefined,
      description: row.description ?? undefined,
      approvedAt: row.approved_at ?? undefined,
      approvedBy: row.approved_by ?? undefined,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at ?? undefined,
      updatedBy: row.updated_by ?? undefined,
    };
  }

  public toRevisionRow(entity: ProgrammeRevision): ProgrammeRevisionRow {
    return {
      revision_id: entity.revisionId,
      programme_id: entity.programmeId,
      revision_number: entity.revisionNumber,
      revision_title: entity.revisionTitle,
      is_current: entity.isCurrent,
      status: entity.status,
      msp_file_name: entity.msp_file_name ?? null,
      msp_file_hash: entity.msp_file_hash ?? null,
      description: entity.description ?? null,
      approved_at: entity.approvedAt ?? null,
      approved_by: entity.approvedBy ?? null,
      created_at: entity.createdAt,
      created_by: entity.createdBy,
      updated_at: entity.updatedAt ?? null,
      updated_by: entity.updatedBy ?? null,
    };
  }
}
