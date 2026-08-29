import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (relativePath: string): string =>
  readFileSync(path.join(root, relativePath), 'utf8');

const auditGetRoutes = [
  'src/app/api/audit/[auditId]/route.ts',
  'src/app/api/audit/programme/[programmeId]/route.ts',
  'src/app/api/audit/entity/route.ts',
  'src/app/api/audit/user/[userId]/route.ts',
  'src/app/api/audit/event/[eventType]/route.ts',
];

describe('F3-B05 HTTP authentication and error hardening contract', () => {
  it.each(auditGetRoutes)('%s verifies identity and propagates the exact access token', (route) => {
    const source = read(route);

    expect(source).toContain('extractVerifiedIdentity(request)');
    expect(source).toContain('createAuditReadService(identity.accessToken)');
    expect(source).not.toMatch(/auditService|auditRepository|service.?role/i);
  });

  it('keeps the Audit HTTP read boundary request-scoped and read-only', () => {
    const composition = read('src/composition/auditReadComposition.ts');
    const repository = read('src/repositories/AuditReadRepository.ts');
    const auditRoute = read('src/app/api/audit/route.ts');

    expect(composition).toContain('getSupabaseAuthenticatedClient(accessToken)');
    expect(composition).toContain('new AuditReadRepository(client)');
    expect(repository).toContain('private readonly client: SupabaseClient');
    expect(repository).not.toMatch(/from ['"]@\/lib\/supabase['"]/);
    expect(repository).not.toMatch(/\.(?:insert|update|upsert|delete|rpc)\s*\(/);
    expect(auditRoute).toContain(
      'Audit evidence is created by canonical domain operations only'
    );
    expect(auditRoute).toContain('{ status: 405 }');
  });

  it('closes the Activity task and revision anonymous-client paths', () => {
    for (const route of [
      'src/app/api/activity/task/[taskId]/route.ts',
      'src/app/api/activity/revision/[revisionId]/route.ts',
    ]) {
      const source = read(route);
      expect(source).toContain('extractVerifiedIdentity(request)');
      expect(source).toContain('getSupabaseAuthenticatedClient(identity.accessToken)');
      expect(source).toContain('new SupabaseDatabaseAdapter(client)');
      expect(source).not.toMatch(/\bsupabase\b.*from ['"]@\/lib\/supabase['"]/);
      expect(source).not.toContain('extractIdentity(request)');
    }
  });

  it('propagates caller context through Site Diary by Activity and Activity History', () => {
    const diaryRoute = read('src/app/api/site-diary/activity/[activityId]/route.ts');
    const historyRoute = read('src/app/api/activities/[activityId]/history/route.ts');
    const activityComposition = read('src/composition/activityComposition.ts');

    expect(diaryRoute).toContain('createSiteDiaryService(identity.accessToken)');
    expect(historyRoute).toContain('createOpenActivityService(identity.accessToken)');
    expect(historyRoute).not.toContain('services.openActivity()');
    expect(activityComposition).toContain(
      'new ActivityLogRepository(authenticatedAdapter)'
    );
  });

  it('also closes the legacy single Activity history projection', () => {
    const route = read('src/app/api/activities/[activityId]/route.ts');

    expect(route).toContain('extractVerifiedIdentity(request)');
    expect(route).toContain('createOpenActivityService(identity.accessToken)');
    expect(route).not.toContain('services.openActivity()');
  });

  it('redacts shared plain and BaseAppError 5xx responses', () => {
    const response = read('src/app/api/_shared/response.ts');

    expect(response).toContain("code: 'INTERNAL_SERVER_ERROR'");
    expect(response).toContain("message: 'Internal server error'");
    expect(response).toMatch(/if \(status >= 500\) \{\s*return internalServerErrorResponse\(\)/);
    expect(response).toMatch(/if \(defaultStatus >= 500\) \{\s*return internalServerErrorResponse\(\)/);
  });

  it('keeps raw exception expressions out of direct literal HTTP 500 bodies', () => {
    const apiRoot = path.join(root, 'src/app/api');
    const vulnerableRoutes = [
      'activities/route.ts',
      'activity/route.ts',
      'activity/[activityId]/route.ts',
      'activity/task/[taskId]/route.ts',
      'activity/revision/[revisionId]/route.ts',
      'approval/route.ts',
      'approval/[approvalId]/route.ts',
      'audit/[auditId]/route.ts',
      'audit/entity/route.ts',
      'audit/event/[eventType]/route.ts',
      'audit/programme/[programmeId]/route.ts',
      'audit/user/[userId]/route.ts',
      'programme/route.ts',
      'programme-revision/route.ts',
      'site-diary/activity/[activityId]/route.ts',
      'task/route.ts',
      'trade-library/route.ts',
      'vo-items/route.ts',
      'workforce/route.ts',
    ];

    const source = vulnerableRoutes
      .map((route) => readFileSync(path.join(apiRoot, route), 'utf8'))
      .join('\n');

    expect(source).not.toMatch(/error\?\.message\s*\|\|/);
    expect(source).not.toMatch(/\{\s*error:\s*error\.message\s*\},\s*\{\s*status:\s*500/);
    expect(source).not.toMatch(/\{\s*error:\s*result\.error\.message\s*\},\s*\{\s*status:\s*500/);
    expect(source).not.toMatch(/\{\s*error:\s*msg\s*\},\s*\{\s*status:\s*500/);
  });

  it('validates UUID route identifiers before protected repository execution', () => {
    for (const route of [
      ...auditGetRoutes.slice(0, 2),
      'src/app/api/activity/[activityId]/route.ts',
      'src/app/api/activity/task/[taskId]/route.ts',
      'src/app/api/activity/revision/[revisionId]/route.ts',
      'src/app/api/site-diary/activity/[activityId]/route.ts',
      'src/app/api/activities/[activityId]/history/route.ts',
    ]) {
      expect(read(route)).toContain('isValidUuid(');
    }
  });
});
