import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/programme/[programmeId]/route';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { createProgrammeService } from '@/composition/programmeComposition';
import { Failure, Success } from '@/lib/result';
import { InfrastructureError } from '@/lib/errors';
import { IProgrammeService } from '@/services/IProgrammeService';

vi.mock('@/app/api/_shared/identity', () => ({
  extractIdentity: vi.fn(),
  extractVerifiedIdentity: vi.fn(),
}));

vi.mock('@/composition/programmeComposition', () => ({
  createProgrammeService: vi.fn(),
}));

const context = (programmeId: string) => ({ params: Promise.resolve({ programmeId }) });

describe('GET /api/programme/[programmeId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses verified identity and passes the caller access token to Programme composition', async () => {
    vi.mocked(extractVerifiedIdentity).mockResolvedValue({
      actorId: 'member-1',
      accessToken: 'verified-token',
    });
    const service = {
      getProgramme: vi.fn().mockResolvedValue(Success(null)),
    };
    vi.mocked(createProgrammeService).mockReturnValue(service as unknown as IProgrammeService);
    const request = new Request('http://localhost/api/programme/programme-a', {
      headers: { Authorization: 'Bearer verified-token' },
    });

    const response = await GET(request, context('programme-a'));

    expect(extractVerifiedIdentity).toHaveBeenCalledWith(request);
    expect(createProgrammeService).toHaveBeenCalledWith({ accessToken: 'verified-token' });
    expect(service.getProgramme).toHaveBeenCalledWith('programme-a');
    expect(response.status).toBe(404);
  });

  it('returns 401 and does not compose a service for an anonymous caller', async () => {
    vi.mocked(extractVerifiedIdentity).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/programme/programme-a'),
      context('programme-a'),
    );

    expect(response.status).toBe(401);
    expect(createProgrammeService).not.toHaveBeenCalled();
  });

  it('returns the member-visible Programme without changing its DTO shape', async () => {
    vi.mocked(extractVerifiedIdentity).mockResolvedValue({
      actorId: 'member-1',
      accessToken: 'verified-token',
    });
    const programme = { programmeId: 'programme-a', programmeName: 'Programme A' };
    vi.mocked(createProgrammeService).mockReturnValue({
      getProgramme: vi.fn().mockResolvedValue(Success(programme)),
    } as unknown as IProgrammeService);

    const response = await GET(
      new Request('http://localhost/api/programme/programme-a'),
      context('programme-a'),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: programme });
  });

  it('does not expose raw database errors', async () => {
    vi.mocked(extractVerifiedIdentity).mockResolvedValue({
      actorId: 'member-1',
      accessToken: 'verified-token',
    });
    vi.mocked(createProgrammeService).mockReturnValue({
      getProgramme: vi
        .fn()
        .mockResolvedValue(
          Failure(
            new InfrastructureError(
              'Database error [42501]: permission denied for table programme',
            ),
          ),
        ),
    } as unknown as IProgrammeService);

    const response = await GET(
      new Request('http://localhost/api/programme/foreign-programme'),
      context('foreign-programme'),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Failed to retrieve programme' });
    expect(JSON.stringify(body)).not.toMatch(/42501|permission denied|Database error/i);
  });
});

describe('PATCH /api/programme/[programmeId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for anonymous caller', async () => {
    vi.mocked(extractVerifiedIdentity).mockResolvedValue(null);
    const request = new Request('http://localhost/api/programme/programme-a', {
      method: 'PATCH',
      body: JSON.stringify({ programmeName: 'Updated' }),
    });
    const context = (programmeId: string) => ({ params: Promise.resolve({ programmeId }) });
    const response = await (await import('@/app/api/programme/[programmeId]/route')).PATCH(request, context('programme-a'));
    expect(response.status).toBe(401);
  });

  it('uses verified identity, passes access token, and sets updatedBy', async () => {
    vi.mocked(extractVerifiedIdentity).mockResolvedValue({
      actorId: 'verified-actor-id',
      accessToken: 'verified-token',
    });
    const service = {
      updateProgramme: vi.fn().mockResolvedValue(Success({ programmeId: 'programme-a' })),
    };
    vi.mocked(createProgrammeService).mockReturnValue(service as unknown as IProgrammeService);
    const request = new Request('http://localhost/api/programme/programme-a', {
      method: 'PATCH',
      body: JSON.stringify({ programmeName: 'Updated Name', employerName: 'Employer X' }),
      headers: { Authorization: 'Bearer verified-token' },
    });
    const context = (programmeId: string) => ({ params: Promise.resolve({ programmeId }) });
    const response = await (await import('@/app/api/programme/[programmeId]/route')).PATCH(request, context('programme-a'));

    expect(extractVerifiedIdentity).toHaveBeenCalledWith(request);
    expect(createProgrammeService).toHaveBeenCalledWith({ accessToken: 'verified-token' });
    expect(service.updateProgramme).toHaveBeenCalledWith({
      programmeId: 'programme-a',
      programmeName: 'Updated Name',
      employerName: 'Employer X',
      contractorName: undefined,
      supervisingOfficer: undefined,
      contractStartDate: undefined,
      contractCompletionDate: undefined,
      defectLiabilityEnd: undefined,
      updatedBy: 'verified-actor-id',
    });
    expect(response.status).toBe(200);
  });

  it('redacts unexpected DB errors and returns a safe HTTP 500', async () => {
    vi.mocked(extractVerifiedIdentity).mockResolvedValue({
      actorId: 'member-1',
      accessToken: 'verified-token',
    });
    const service = {
      updateProgramme: vi.fn().mockResolvedValue(
        Failure(new InfrastructureError('Database error [PT999]: obscure PostgREST trace')),
      ),
    };
    vi.mocked(createProgrammeService).mockReturnValue(service as unknown as IProgrammeService);

    const request = new Request('http://localhost/api/programme/programme-a', {
      method: 'PATCH',
      body: JSON.stringify({ programmeName: 'Updated' }),
      headers: { Authorization: 'Bearer verified-token' },
    });
    const context = (programmeId: string) => ({ params: Promise.resolve({ programmeId }) });
    const response = await (await import('@/app/api/programme/[programmeId]/route')).PATCH(request, context('programme-a'));

    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Failed to update programme' });
    expect(JSON.stringify(body)).not.toMatch(/PT999|PostgREST|obscure/i);
  });

  it('maps PROGRAMME_NOT_FOUND to HTTP 404', async () => {
    vi.mocked(extractVerifiedIdentity).mockResolvedValue({ actorId: 'member-1', accessToken: 'token' });
    const service = { updateProgramme: vi.fn().mockResolvedValue(Failure({ errorCode: 'PROGRAMME_NOT_FOUND' })) };
    vi.mocked(createProgrammeService).mockReturnValue(service as unknown as IProgrammeService);
    const request = new Request('http://localhost/api/programme/programme-a', { method: 'PATCH', body: JSON.stringify({ programmeName: 'Updated' }) });
    const context = (programmeId: string) => ({ params: Promise.resolve({ programmeId }) });
    const response = await (await import('@/app/api/programme/[programmeId]/route')).PATCH(request, context('programme-a'));
    expect(response.status).toBe(404);
  });

  it('maps PROGRAMME_VALIDATION_FAILED to HTTP 400 safely', async () => {
    vi.mocked(extractVerifiedIdentity).mockResolvedValue({ actorId: 'member-1', accessToken: 'token' });
    const validationError = { errorCode: 'PROGRAMME_VALIDATION_FAILED', message: 'Internal DB validation message [PT400]: C06_COMPLETION_BEFORE_START' };
    const service = { updateProgramme: vi.fn().mockResolvedValue(Failure(validationError)) };
    vi.mocked(createProgrammeService).mockReturnValue(service as unknown as IProgrammeService);
    const request = new Request('http://localhost/api/programme/programme-a', { method: 'PATCH', body: JSON.stringify({ programmeName: 'Updated' }) });
    const context = (programmeId: string) => ({ params: Promise.resolve({ programmeId }) });
    const response = await (await import('@/app/api/programme/[programmeId]/route')).PATCH(request, context('programme-a'));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: 'Validation failed' });
    expect(JSON.stringify(body)).not.toMatch(/PT400|C06_COMPLETION_BEFORE_START/i);
  });
});
