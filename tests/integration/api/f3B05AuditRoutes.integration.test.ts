import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  extractVerifiedIdentity: vi.fn(),
  createAuditReadService: vi.fn(),
  getAuditById: vi.fn(),
  getAuditByProgramme: vi.fn(),
  getAuditByEntity: vi.fn(),
  getAuditByUser: vi.fn(),
  getAuditByEventType: vi.fn(),
}));

vi.mock('@/app/api/_shared/identity', () => ({
  extractVerifiedIdentity: mocks.extractVerifiedIdentity,
}));

vi.mock('@/composition/auditReadComposition', () => ({
  createAuditReadService: mocks.createAuditReadService,
}));

import { GET as getAuditById } from '@/app/api/audit/[auditId]/route';
import { GET as getAuditByProgramme } from '@/app/api/audit/programme/[programmeId]/route';
import { GET as getAuditByEntity } from '@/app/api/audit/entity/route';
import { GET as getAuditByUser } from '@/app/api/audit/user/[userId]/route';
import { GET as getAuditByEventType } from '@/app/api/audit/event/[eventType]/route';
import { POST as postAudit } from '@/app/api/audit/route';

const auditId = '11111111-1111-4111-8111-111111111111';
const programmeId = '22222222-2222-4222-8222-222222222222';
const entityId = '33333333-3333-4333-8333-333333333333';
const userId = '44444444-4444-4444-8444-444444444444';
const identity = { actorId: userId, accessToken: 'f3-b05-exact-jwt' };

function request(pathname: string): Request {
  return new Request(`http://localhost${pathname}`, {
    headers: { authorization: `Bearer ${identity.accessToken}` },
  });
}

describe('F3-B05 authenticated Audit HTTP reads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractVerifiedIdentity.mockResolvedValue(identity);
    mocks.getAuditById.mockResolvedValue(null);
    mocks.getAuditByProgramme.mockResolvedValue([]);
    mocks.getAuditByEntity.mockResolvedValue([]);
    mocks.getAuditByUser.mockResolvedValue([]);
    mocks.getAuditByEventType.mockResolvedValue([]);
    mocks.createAuditReadService.mockReturnValue({
      getAuditById: mocks.getAuditById,
      getAuditByProgramme: mocks.getAuditByProgramme,
      getAuditByEntity: mocks.getAuditByEntity,
      getAuditByUser: mocks.getAuditByUser,
      getAuditByEventType: mocks.getAuditByEventType,
    });
  });

  it.each([
    ['id', getAuditById, request(`/api/audit/${auditId}`), { params: Promise.resolve({ auditId }) }],
    ['programme', getAuditByProgramme, request(`/api/audit/programme/${programmeId}`), { params: Promise.resolve({ programmeId }) }],
    ['entity', getAuditByEntity, request(`/api/audit/entity?entityName=Activity&entityId=${entityId}`), undefined],
    ['user', getAuditByUser, request(`/api/audit/user/${userId}`), { params: Promise.resolve({ userId }) }],
    ['event', getAuditByEventType, request('/api/audit/event/Create'), { params: Promise.resolve({ eventType: 'Create' }) }],
  ])('rejects an unauthenticated %s read before composition', async (_name, route, req, context) => {
    mocks.extractVerifiedIdentity.mockResolvedValue(null);

    const response = await (route as (request: Request, context?: unknown) => Promise<Response>)(
      req,
      context
    );

    expect(response.status).toBe(401);
    expect(mocks.createAuditReadService).not.toHaveBeenCalled();
  });

  it('propagates the exact verified token to every Audit GET composition', async () => {
    await getAuditById(request(`/api/audit/${auditId}`), { params: Promise.resolve({ auditId }) });
    await getAuditByProgramme(request(`/api/audit/programme/${programmeId}`), {
      params: Promise.resolve({ programmeId }),
    });
    await getAuditByEntity(
      request(`/api/audit/entity?entityName=Activity&entityId=${entityId}`)
    );
    await getAuditByUser(request(`/api/audit/user/${userId}`), {
      params: Promise.resolve({ userId }),
    });
    await getAuditByEventType(request('/api/audit/event/Create'), {
      params: Promise.resolve({ eventType: 'Create' }),
    });

    expect(mocks.createAuditReadService).toHaveBeenCalledTimes(5);
    expect(mocks.createAuditReadService).toHaveBeenCalledWith(identity.accessToken);
  });

  it('rejects malformed Audit UUIDs before authenticated read composition', async () => {
    const response = await getAuditById(request('/api/audit/not-a-uuid'), {
      params: Promise.resolve({ auditId: 'not-a-uuid' }),
    });

    expect(response.status).toBe(400);
    expect(mocks.createAuditReadService).not.toHaveBeenCalled();
    expect(mocks.getAuditById).not.toHaveBeenCalled();
  });

  it('makes RLS-hidden and nonexistent single Audit records indistinguishable', async () => {
    const foreign = await getAuditById(request(`/api/audit/${auditId}`), {
      params: Promise.resolve({ auditId }),
    });
    const unknownId = '55555555-5555-4555-8555-555555555555';
    const nonexistent = await getAuditById(request(`/api/audit/${unknownId}`), {
      params: Promise.resolve({ auditId: unknownId }),
    });

    expect(foreign.status).toBe(404);
    expect(nonexistent.status).toBe(404);
    expect(await foreign.json()).toEqual(await nonexistent.json());
  });

  it('returns only the Programme-scoped collection supplied by the caller RLS read', async () => {
    const visible = [{ audit_id: auditId, programme_id: programmeId }];
    mocks.getAuditByProgramme.mockResolvedValue(visible);

    const response = await getAuditByProgramme(request(`/api/audit/programme/${programmeId}`), {
      params: Promise.resolve({ programmeId }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: visible });
    expect(mocks.getAuditByProgramme).toHaveBeenCalledWith(programmeId);
  });

  it('redacts raw database failures from Audit 500 responses', async () => {
    mocks.getAuditById.mockRejectedValue(
      new Error('42501 permission denied for table audit; relation "private_secret" does not exist')
    );

    const response = await getAuditById(request(`/api/audit/${auditId}`), {
      params: Promise.resolve({ auditId }),
    });
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(body)).toEqual({ error: 'Internal server error' });
    expect(body).not.toMatch(/42501|permission denied|private_secret|audit/i);
  });

  it('keeps Audit HTTP writes disabled', async () => {
    const response = await postAudit(
      new Request('http://localhost/api/audit', { method: 'POST' })
    );

    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({
      error: 'Audit evidence is created by canonical domain operations only',
    });
  });
});
