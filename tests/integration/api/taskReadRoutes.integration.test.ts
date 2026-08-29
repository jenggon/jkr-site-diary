import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  extractVerifiedIdentity: vi.fn(),
  createTaskReadRepository: vi.fn(),
  getTaskById: vi.fn(),
  getTasksByRevision: vi.fn(),
}));

vi.mock('@/app/api/_shared/identity', () => ({
  extractVerifiedIdentity: mocks.extractVerifiedIdentity,
}));

vi.mock('@/composition/taskReadComposition', () => ({
  createTaskReadRepository: mocks.createTaskReadRepository,
}));

import { GET as getTaskById } from '@/app/api/task/[taskId]/route';
import { GET as getTasksByRevision } from '@/app/api/task/revision/[revisionId]/route';
import { TaskReadRepository } from '@/repositories/TaskReadRepository';

const revisionId = '33333333-3333-3333-3333-333333333333';
const foreignRevisionId = '44444444-4444-4444-4444-444444444444';
const taskId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const task = {
  task_id: taskId,
  programme_id: '11111111-1111-1111-1111-111111111111',
  revision_id: revisionId,
  task_uid: 2,
  task_name: 'C01 Test Task',
};

function request(pathname: string): Request {
  return new Request(`http://localhost${pathname}`, {
    headers: { authorization: 'Bearer p2-verified-token' },
  });
}

describe('F2.7-C08 authenticated Task read routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractVerifiedIdentity.mockResolvedValue({
      actorId: '99999999-9999-9999-9999-999999999992',
      accessToken: 'p2-verified-token',
    });
    mocks.getTaskById.mockResolvedValue(null);
    mocks.getTasksByRevision.mockResolvedValue([]);
    mocks.createTaskReadRepository.mockReturnValue({
      getTaskById: mocks.getTaskById,
      getTasksByRevision: mocks.getTasksByRevision,
    });
  });

  describe('GET /api/task/revision/[revisionId]', () => {
    it('rejects anonymous callers before creating a read repository', async () => {
      mocks.extractVerifiedIdentity.mockResolvedValue(null);

      const response = await getTasksByRevision(
        new Request(`http://localhost/api/task/revision/${revisionId}`),
        { params: Promise.resolve({ revisionId }) }
      );

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
      expect(mocks.createTaskReadRepository).not.toHaveBeenCalled();
      expect(mocks.getTasksByRevision).not.toHaveBeenCalled();
    });

    it('propagates the verified access token and returns P1 visible Tasks', async () => {
      mocks.getTasksByRevision.mockResolvedValue([task]);

      const response = await getTasksByRevision(
        request(`/api/task/revision/${revisionId}`),
        { params: Promise.resolve({ revisionId }) }
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ data: [task] });
      expect(mocks.createTaskReadRepository).toHaveBeenCalledWith('p2-verified-token');
      expect(mocks.getTasksByRevision).toHaveBeenCalledWith(revisionId);
    });

    it('preserves the exact requested revision identity in every returned Task', async () => {
      const visibleTasks = [task, { ...task, task_id: 'task-2', task_uid: 3 }];
      mocks.getTasksByRevision.mockResolvedValue(visibleTasks);

      const response = await getTasksByRevision(
        request(`/api/task/revision/${revisionId}`),
        { params: Promise.resolve({ revisionId }) }
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.data.every((row: { revision_id: string }) => row.revision_id === revisionId)).toBe(
        true
      );
      expect(mocks.getTasksByRevision).toHaveBeenCalledWith(revisionId);
    });

    it('returns an indistinguishable empty result when C07 filters a foreign or inactive caller', async () => {
      const response = await getTasksByRevision(
        request(`/api/task/revision/${foreignRevisionId}`),
        { params: Promise.resolve({ revisionId: foreignRevisionId }) }
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ data: [] });
    });

    it('redacts raw database failures from the 500 response', async () => {
      mocks.getTasksByRevision.mockRejectedValue(
        new Error('42501 permission denied for table task; PostgreSQL detail')
      );

      const response = await getTasksByRevision(
        request(`/api/task/revision/${revisionId}`),
        { params: Promise.resolve({ revisionId }) }
      );
      const bodyText = await response.text();

      expect(response.status).toBe(500);
      expect(JSON.parse(bodyText)).toEqual({ error: 'Failed to retrieve tasks by revision' });
      expect(bodyText).not.toMatch(/42501|permission denied|PostgreSQL|PostgREST/i);
    });
  });

  describe('GET /api/task/[taskId]', () => {
    it('rejects anonymous callers before creating a read repository', async () => {
      mocks.extractVerifiedIdentity.mockResolvedValue(null);

      const response = await getTaskById(new Request(`http://localhost/api/task/${taskId}`), {
        params: Promise.resolve({ taskId }),
      });

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
      expect(mocks.createTaskReadRepository).not.toHaveBeenCalled();
      expect(mocks.getTaskById).not.toHaveBeenCalled();
    });

    it('returns the exact P1-visible Task using the verified caller token', async () => {
      mocks.getTaskById.mockResolvedValue(task);

      const response = await getTaskById(request(`/api/task/${taskId}`), {
        params: Promise.resolve({ taskId }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ data: task });
      expect(mocks.createTaskReadRepository).toHaveBeenCalledWith('p2-verified-token');
      expect(mocks.getTaskById).toHaveBeenCalledWith(taskId);
    });

    it('hides a C07-filtered foreign Task as not found', async () => {
      const response = await getTaskById(request(`/api/task/${taskId}`), {
        params: Promise.resolve({ taskId }),
      });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Task not found' });
    });

    it('returns the same not-found response for an unknown Task', async () => {
      const unknownTaskId = '00000000-0000-4000-8000-000000000000';
      const response = await getTaskById(request(`/api/task/${unknownTaskId}`), {
        params: Promise.resolve({ taskId: unknownTaskId }),
      });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Task not found' });
    });

    it('redacts raw database failures from the 500 response', async () => {
      mocks.getTaskById.mockRejectedValue(
        new Error('42501 permission denied for table task; PostgREST detail')
      );

      const response = await getTaskById(request(`/api/task/${taskId}`), {
        params: Promise.resolve({ taskId }),
      });
      const bodyText = await response.text();

      expect(response.status).toBe(500);
      expect(JSON.parse(bodyText)).toEqual({ error: 'Failed to retrieve task' });
      expect(bodyText).not.toMatch(/42501|permission denied|PostgreSQL|PostgREST/i);
    });
  });
});

describe('F2.7-C08 request-scoped Task read architecture', () => {
  it('uses only the injected client and exact Task filters for both reads', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: task, error: null });
    const taskIdEq = vi.fn(() => ({ maybeSingle }));
    const taskIdSelect = vi.fn(() => ({ eq: taskIdEq }));
    const revisionOrder = vi.fn().mockResolvedValue({ data: [task], error: null });
    const revisionEq = vi.fn(() => ({ order: revisionOrder }));
    const revisionSelect = vi.fn(() => ({ eq: revisionEq }));
    const from = vi
      .fn()
      .mockReturnValueOnce({ select: taskIdSelect })
      .mockReturnValueOnce({ select: revisionSelect });
    const repository = new TaskReadRepository({ from } as unknown as SupabaseClient);

    await expect(repository.getTaskById(taskId)).resolves.toEqual(task);
    await expect(repository.getTasksByRevision(revisionId)).resolves.toEqual([task]);

    expect(from).toHaveBeenNthCalledWith(1, 'task');
    expect(taskIdEq).toHaveBeenCalledWith('task_id', taskId);
    expect(from).toHaveBeenNthCalledWith(2, 'task');
    expect(revisionEq).toHaveBeenCalledWith('revision_id', revisionId);
    expect(revisionOrder).toHaveBeenCalledWith('display_order', {
      ascending: true,
      nullsFirst: false,
    });
  });

  it('keeps GET composition authenticated, RLS-sovereign, and separate from global mutations', () => {
    const root = process.cwd();
    const revisionRoute = readFileSync(
      path.join(root, 'src/app/api/task/revision/[revisionId]/route.ts'),
      'utf8'
    );
    const taskRoute = readFileSync(path.join(root, 'src/app/api/task/[taskId]/route.ts'), 'utf8');
    const composition = readFileSync(
      path.join(root, 'src/composition/taskReadComposition.ts'),
      'utf8'
    );
    const readRepository = readFileSync(
      path.join(root, 'src/repositories/TaskReadRepository.ts'),
      'utf8'
    );
    const mutationRepository = readFileSync(
      path.join(root, 'src/repositories/taskRepository.ts'),
      'utf8'
    );
    const c08Source = `${revisionRoute}\n${taskRoute}\n${composition}\n${readRepository}`;

    expect(revisionRoute).toContain('extractVerifiedIdentity(request)');
    expect(taskRoute).toContain('extractVerifiedIdentity(request)');
    expect(revisionRoute).not.toMatch(/taskService|taskRepository/);
    expect(taskRoute).not.toMatch(/taskService|taskRepository/);
    expect(composition).toContain('getSupabaseAuthenticatedClient(accessToken)');
    expect(composition).toContain('new TaskReadRepository(client)');
    expect(readRepository).toContain('private readonly client: SupabaseClient');
    expect(c08Source).not.toMatch(/programme_membership|service.?role/i);
    expect(readRepository).not.toMatch(/\.(?:insert|update|upsert|delete|rpc)\s*\(/);
    expect(mutationRepository).toContain('export async function createTask');
    expect(mutationRepository).toContain('export async function bulkCreateTasks');
    expect(mutationRepository).toContain('export async function updateTask');
    expect(mutationRepository).not.toContain('TaskReadRepository');
  });
});
