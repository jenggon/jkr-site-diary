import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getProjectSummary } from '@/app/api/project-summary/route';
import { GET as getAhi } from '@/app/api/ahi/route';
import { GET as getWorkpackages } from '@/app/api/workpackages/route';
import { GET as getReports } from '@/app/api/reports/route';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { createA26QueryService } from '@/composition/a26QueryComposition';

const queryService = vi.hoisted(() => ({
  getProjectSummary: vi.fn(),
  getAhi: vi.fn(),
  getWorkpackages: vi.fn(),
  getReports: vi.fn(),
}));

vi.mock('@/app/api/_shared/identity', () => ({
  extractVerifiedIdentity: vi.fn(),
}));

vi.mock('@/composition/a26QueryComposition', () => ({
  createA26QueryService: vi.fn(() => queryService),
}));

const routes = [
  {
    name: 'project-summary',
    request: () => new NextRequest('http://localhost/api/project-summary?programmeId=programme-a'),
    get: getProjectSummary,
  },
  {
    name: 'ahi',
    request: () => new NextRequest('http://localhost/api/ahi?programmeId=programme-a'),
    get: getAhi,
  },
  {
    name: 'workpackages',
    request: () =>
      new NextRequest('http://localhost/api/workpackages?building=1&programmeId=programme-a'),
    get: getWorkpackages,
  },
  {
    name: 'reports',
    request: () => new NextRequest('http://localhost/api/reports?date=2026-08-23'),
    get: getReports,
  },
] as const;

describe('authenticated A26 HTTP routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(extractVerifiedIdentity).mockResolvedValue({
      actorId: 'member-1',
      accessToken: 'verified-token',
    });
    queryService.getProjectSummary.mockResolvedValue(null);
    queryService.getAhi.mockResolvedValue([]);
    queryService.getWorkpackages.mockResolvedValue([]);
    queryService.getReports.mockResolvedValue([]);
  });

  it.each(routes)('$name requires a verified identity', async ({ request, get }) => {
    vi.mocked(extractVerifiedIdentity).mockResolvedValue(null);
    const req = request();

    const response = await get(req);

    expect(response.status).toBe(401);
    expect(extractVerifiedIdentity).toHaveBeenCalledWith(req);
    expect(createA26QueryService).not.toHaveBeenCalled();
  });

  it.each(routes)(
    '$name composes a request-scoped service with the verified token',
    async ({ request, get }) => {
      const req = request();

      const response = await get(req);

      expect(response.status).toBe(200);
      expect(createA26QueryService).toHaveBeenCalledWith('verified-token');
    },
  );

  it('maps a foreign Programme to a safe 404 without revealing its ID', async () => {
    queryService.getAhi.mockRejectedValue(
      new Error('Programme or current revision not found: foreign-programme'),
    );

    const response = await getAhi(
      new NextRequest('http://localhost/api/ahi?programmeId=foreign-programme'),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'Programme not found' });
    expect(JSON.stringify(body)).not.toContain('foreign-programme');
  });

  it.each([
    { name: 'project-summary', get: getProjectSummary, request: routes[0].request },
    { name: 'ahi', get: getAhi, request: routes[1].request },
    { name: 'workpackages', get: getWorkpackages, request: routes[2].request },
    { name: 'reports', get: getReports, request: routes[3].request },
  ])('$name sanitizes unexpected database errors', async ({ name, get, request }) => {
    const method =
      name === 'project-summary'
        ? queryService.getProjectSummary
        : name === 'ahi'
          ? queryService.getAhi
          : name === 'workpackages'
            ? queryService.getWorkpackages
            : queryService.getReports;
    method.mockRejectedValueOnce(
      new Error('Database error [42501]: permission denied for table programme'),
    );

    const response = await get(request());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toMatch(/42501|permission denied|Database error/i);
  });
});
