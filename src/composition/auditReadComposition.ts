import { getSupabaseAuthenticatedClient } from '@/lib/supabase';
import { AuditReadRepository } from '@/repositories/AuditReadRepository';
import { AuditReadService } from '@/services/AuditReadService';

export function createAuditReadService(accessToken: string): AuditReadService {
  const client = getSupabaseAuthenticatedClient(accessToken);
  return new AuditReadService(new AuditReadRepository(client));
}
