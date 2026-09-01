import { describe, it, expect } from 'vitest';
import { CreateProgrammeDTO, ProgrammeResponseDTO } from '@/dto/programmeDto';

describe('Programme DTOs', () => {
  it('should instantiate CreateProgrammeDTO cleanly', () => {
    const dto: CreateProgrammeDTO = {
      programmeCode: 'JKR/PLS/2026/001',
      programmeName: 'Projek Pembinaan Jalan Perlis',
      programmeShortName: 'JALAN PLS',
      employerName: 'Jabatan Kerja Raya Perlis',
    };

    expect(dto.programmeCode).toBe('JKR/PLS/2026/001');
    expect(dto.programmeShortName).toBe('JALAN PLS');
    expect(dto.employerName).toBe('Jabatan Kerja Raya Perlis');
  });

  it('should instantiate ProgrammeResponseDTO cleanly', () => {
    const res: ProgrammeResponseDTO = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      code: 'JKR/PLS/2026/001',
      name: 'Projek Pembinaan Jalan Perlis',
      shortName: 'JALAN PLS',
      status: 'Active',
      isLocked: false,
      createdAt: '2026-08-07T12:00:00.000Z',
      createdBy: '123e4567-e89b-12d3-a456-426614174001',
    };

    expect(res.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(res.shortName).toBe('JALAN PLS');
    expect(res.status).toBe('Active');
  });
});
