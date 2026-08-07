import { describe, it, expect } from 'vitest';
import { Programme } from '@/types/programme';
import { mapProgrammeToResponseDTO } from '@/mappers/programmeMapper';

describe('Programme Mapper Contracts', () => {
  it('should map Programme domain entity to ProgrammeResponseDTO', () => {
    const programme: Programme = {
      programmeId: '123e4567-e89b-12d3-a456-426614174000',
      programmeCode: 'JKR/PLS/2026/001',
      programmeName: 'Projek Pembinaan Jalan Perlis',
      employerName: 'Jabatan Kerja Raya',
      contractorName: 'Pembinaan Maju Sdn Bhd',
      status: 'Active',
      isLocked: false,
      createdAt: '2026-08-07T12:00:00.000Z',
      createdBy: '123e4567-e89b-12d3-a456-426614174001',
    };

    const responseDto = mapProgrammeToResponseDTO(programme);
    expect(responseDto.id).toBe(programme.programmeId);
    expect(responseDto.code).toBe(programme.programmeCode);
    expect(responseDto.name).toBe(programme.programmeName);
    expect(responseDto.status).toBe('Active');
    expect(responseDto.isLocked).toBe(false);
  });
});
