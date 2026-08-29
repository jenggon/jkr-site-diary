import { describe, it, expect } from 'vitest';
import { Programme } from '@/types/programme';
import { ProgrammeRevision } from '@/types/programmeRevision';

describe('Programme & ProgrammeRevision Domain Types', () => {
  it('should instantiate Programme typed object correctly', () => {
    const programme: Programme = {
      programmeId: '123e4567-e89b-12d3-a456-426614174000',
      programmeCode: 'JKR/PLS/2026/001',
      programmeName: 'Projek Pembinaan Jalan Perlis',
      status: 'Active',
      isLocked: false,
      createdAt: '2026-08-07T12:00:00.000Z',
      createdBy: '123e4567-e89b-12d3-a456-426614174001',
    };

    expect(programme.programmeCode).toBe('JKR/PLS/2026/001');
    expect(programme.status).toBe('Active');
    expect(programme.isLocked).toBe(false);
  });

  it('should instantiate ProgrammeRevision typed object correctly', () => {
    const revision: ProgrammeRevision = {
      revisionId: '123e4567-e89b-12d3-a456-426614174002',
      programmeId: '123e4567-e89b-12d3-a456-426614174000',
      revisionNumber: 1,
      revisionTitle: 'Initial Baseline Revision',
      isCurrent: true,
      status: 'Approved',
      createdAt: '2026-08-07T12:00:00.000Z',
      createdBy: '123e4567-e89b-12d3-a456-426614174001',
    };

    expect(revision.revisionNumber).toBe(1);
    expect(revision.status).toBe('Approved');
    expect(revision.isCurrent).toBe(true);
  });
});
