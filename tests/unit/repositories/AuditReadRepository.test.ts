import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { AuditReadRepository } from '@/repositories/AuditReadRepository';

describe('F3-B05 AuditReadRepository', () => {
  it('uses only its injected caller-scoped client for a single Audit read', async () => {
    const row = {
      audit_id: '11111111-1111-4111-8111-111111111111',
      programme_id: '22222222-2222-4222-8222-222222222222',
    };
    const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const repository = new AuditReadRepository({ from } as unknown as SupabaseClient);

    await expect(repository.getById(row.audit_id)).resolves.toEqual(row);
    expect(from).toHaveBeenCalledWith('audit');
    expect(select).toHaveBeenCalledWith('*');
    expect(eq).toHaveBeenCalledWith('audit_id', row.audit_id);
  });

  it('returns the normal empty collection supplied by caller RLS', async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const repository = new AuditReadRepository({ from } as unknown as SupabaseClient);
    const programmeId = '22222222-2222-4222-8222-222222222222';

    await expect(repository.getByProgramme(programmeId)).resolves.toEqual([]);
    expect(from).toHaveBeenCalledWith('audit');
    expect(eq).toHaveBeenCalledWith('programme_id', programmeId);
    expect(order).toHaveBeenCalledWith('event_timestamp', { ascending: false });
  });
});
