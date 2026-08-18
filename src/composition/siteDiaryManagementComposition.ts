import { getSupabaseAuthenticatedClient } from '@/lib/supabase';
import { SiteDiaryManagementReadRepository } from '@/repositories/SiteDiaryManagementReadRepository';
import { SiteDiaryManagementReadService } from '@/services/SiteDiaryManagementReadService';

export function createSiteDiaryManagementReadService(accessToken: string): SiteDiaryManagementReadService {
  const client = getSupabaseAuthenticatedClient(accessToken);
  return new SiteDiaryManagementReadService(new SiteDiaryManagementReadRepository(client));
}
