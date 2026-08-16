import { describe, it, expect } from 'vitest';
import { ProgrammeRowMapper } from '@/repositories/mappers/ProgrammeRowMapper';
import { ProgrammeRow, ProgrammeRevisionRow } from '@/repositories/types/programmeRow';
import { Programme } from '@/types/programme';
import { ProgrammeRevision } from '@/types/programmeRevision';

describe('ProgrammeRowMapper', () => {
  const mapper = new ProgrammeRowMapper();

  it('should map ProgrammeRow to Programme domain entity', () => {
    const row: ProgrammeRow = {
      programme_id: '123e4567-e89b-12d3-a456-426614174000',
      programme_code: 'JKR/PLS/2026/001',
      programme_name: 'Projek Pembinaan Jalan Perlis',
      employer_name: 'JKR',
      contractor_name: 'Maju Builder',
      supervising_officer: 'En Ahmad',
      contract_start_date: '2026-01-01',
      contract_completion_date: '2026-12-31',
      defect_liability_end: '2027-12-31',
      current_revision_id: '123e4567-e89b-12d3-a456-426614174001',
      status: 'Approved',
      is_locked: false,
      created_at: '2026-08-07T12:00:00.000Z',
      created_by: 'user-1',
      updated_at: null,
      updated_by: null,
      archived_at: null,
      archived_by: null,
    };

    const domain = mapper.toDomain(row);
    expect(domain.programmeId).toBe(row.programme_id);
    expect(domain.programmeCode).toBe(row.programme_code);
    expect(domain.status).toBe('Active');
    expect(domain.employerName).toBe('JKR');
  });

  it('should map Programme domain entity back to ProgrammeRow', () => {
    const domain: Programme = {
      programmeId: '123e4567-e89b-12d3-a456-426614174000',
      programmeCode: 'JKR/PLS/2026/001',
      programmeName: 'Projek Pembinaan Jalan Perlis',
      status: 'Active',
      isLocked: false,
      createdAt: '2026-08-07T12:00:00.000Z',
      createdBy: 'user-1',
    };

    const row = mapper.toRow(domain);
    expect(row.programme_id).toBe(domain.programmeId);
    expect(row.programme_code).toBe(domain.programmeCode);
    expect(row.employer_name).toBeNull();
    expect(row.status).toBe('Approved');
  });

  it('should map ProgrammeRevisionRow to ProgrammeRevision domain entity', () => {
    const revisionRow: ProgrammeRevisionRow = {
      revision_id: 'rev-1',
      programme_id: 'prog-1',
      revision_no: 1,
      revision_name: 'Baseline Revision',
      status: 'Approved',
      msp_file_name: null,
      msp_file_hash: null,
      msp_imported_at: null,
      msp_imported_by: null,
      baseline_date: null,
      approval_date: null,
      effective_date: null,
      approved_at: '2026-08-07T12:00:00.000Z',
      approved_by: 'user-1',
      archived_at: null,
      archived_by: null,
      created_at: '2026-08-07T12:00:00.000Z',
      created_by: 'user-1',
    };

    const revisionDomain = mapper.toRevisionDomain(revisionRow, 'rev-1');
    expect(revisionDomain.revisionId).toBe('rev-1');
    expect(revisionDomain.isCurrent).toBe(true);
    expect(revisionDomain.status).toBe('Approved');
  });

  it('should derive a non-current revision from the programme current revision pointer', () => {
    const revisionRow = mapper.toRevisionRow({
      revisionId: 'rev-1',
      programmeId: 'prog-1',
      revisionNumber: 1,
      revisionTitle: 'Superseded Revision',
      isCurrent: false,
      status: 'Superseded',
      createdAt: '2026-08-07T12:00:00.000Z',
      createdBy: 'user-1',
    });

    expect(mapper.toRevisionDomain(revisionRow, 'rev-2').isCurrent).toBe(false);
  });

  it('should map ProgrammeRevision domain entity back to ProgrammeRevisionRow', () => {
    const revisionDomain: ProgrammeRevision = {
      revisionId: 'rev-1',
      programmeId: 'prog-1',
      revisionNumber: 1,
      revisionTitle: 'Baseline Revision',
      isCurrent: true,
      status: 'Approved',
      createdAt: '2026-08-07T12:00:00.000Z',
      createdBy: 'user-1',
    };

    const revisionRow = mapper.toRevisionRow(revisionDomain);
    expect(revisionRow.revision_id).toBe('rev-1');
    expect(revisionRow.revision_no).toBe(1);
    expect(revisionRow.revision_name).toBe('Baseline Revision');
    expect(revisionRow).not.toHaveProperty('is_current');
  });
});
