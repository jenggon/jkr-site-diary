import { ApprovalQueueReadRepository } from '@/repositories/ApprovalQueueReadRepository';
import { describe, it, expect } from 'vitest';

describe('ApprovalQueueReadRepository', () => {
  const createMockClient = (rpcFn: (name: string, args: Record<string, unknown>) => Promise<unknown>) => ({
    rpc: rpcFn,
  });

  it('maps PT403 exception to F24_UNAUTHORIZED_CAPABILITY', async () => {
    const client = createMockClient(async () => ({
      data: null,
      error: { code: 'PT403', message: 'F24_UNAUTHORIZED_CAPABILITY' },
    }));
    const repo = new ApprovalQueueReadRepository(client as never);

    await expect(repo.getQueue('prog-1')).rejects.toThrow('F24_UNAUTHORIZED_CAPABILITY');
  });

  it('successfully returns queue items', async () => {
    const mockItems = [{ approval_id: '123' }];
    const client = createMockClient(async () => ({
      data: mockItems,
      error: null,
    }));
    const repo = new ApprovalQueueReadRepository(client as never);

    const result = await repo.getQueue('prog-1');
    expect(result).toEqual(mockItems);
  });
});
