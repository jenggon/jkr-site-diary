import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/programme/route';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { createProgrammeService } from '@/composition/programmeComposition';
import { Success, Failure } from '@/lib/result';
import { ValidationError } from '@/lib/errors';
import { Programme } from '@/types/programme';
import { IProgrammeService } from '@/services/IProgrammeService';

vi.mock('@/app/api/_shared/identity', () => ({
  extractVerifiedIdentity: vi.fn(),
}));

vi.mock('@/composition/programmeComposition', () => ({
  createProgrammeService: vi.fn(),
}));

describe('GET /api/programme Route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 Unauthorized when identity is missing or invalid', async () => {
    vi.mocked(extractVerifiedIdentity).mockResolvedValueOnce(null);

    const request = new Request('http://localhost/api/programme');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('delegates to ProgrammeService.listProgrammes and returns mapped DTOs', async () => {
    vi.mocked(extractVerifiedIdentity).mockResolvedValueOnce({
      actorId: 'user-123',
      accessToken: 'token-abc',
    });

    const mockProgramme: Programme = {
      programmeId: 'prog-uuid-1',
      programmeCode: 'JKR/HQ/2026/01',
      programmeName: 'Cadangan Membina Hospital',
      employerName: 'JKR Malaysia',
      contractorName: 'Pembinaan Maju Sdn Bhd',
      status: 'Active',
      isLocked: false,
      currentRevisionId: 'rev-uuid-1',
      createdAt: '2026-08-01T00:00:00Z',
      createdBy: 'admin-1',
    };

    const mockService = {
      listProgrammes: vi.fn().mockResolvedValueOnce(Success([mockProgramme])),
    };

    vi.mocked(createProgrammeService).mockReturnValueOnce(mockService as unknown as IProgrammeService);

    const request = new Request('http://localhost/api/programme?status=Active&limit=10&offset=0');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockService.listProgrammes).toHaveBeenCalledWith({
      status: 'Active',
      limit: 10,
      offset: 0,
    });

    const json = await response.json();
    expect(json.data).toEqual([
      {
        id: 'prog-uuid-1',
        code: 'JKR/HQ/2026/01',
        name: 'Cadangan Membina Hospital',
        employerName: 'JKR Malaysia',
        contractorName: 'Pembinaan Maju Sdn Bhd',
        supervisingOfficer: undefined,
        status: 'Active',
        isLocked: false,
        currentRevisionId: 'rev-uuid-1',
        createdAt: '2026-08-01T00:00:00Z',
        createdBy: 'admin-1',
        archivedAt: undefined,
      },
    ]);
  });

  it('returns 400 when listProgrammes fails', async () => {
    vi.mocked(extractVerifiedIdentity).mockResolvedValueOnce({
      actorId: 'user-123',
      accessToken: 'token-abc',
    });

    const mockService = {
      listProgrammes: vi.fn().mockResolvedValueOnce(Failure(new ValidationError('Database error'))),
    };

    vi.mocked(createProgrammeService).mockReturnValueOnce(mockService as unknown as IProgrammeService);

    const request = new Request('http://localhost/api/programme');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Database error');
  });
});
