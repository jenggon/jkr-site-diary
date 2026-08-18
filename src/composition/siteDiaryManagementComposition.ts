import { getSupabaseAuthenticatedClient } from '@/lib/supabase';
import { SiteDiaryManagementReadRepository } from '@/repositories/SiteDiaryManagementReadRepository';
import { SiteDiaryManagementReadService } from '@/services/SiteDiaryManagementReadService';
import { SiteDiaryHistoryRepository } from '@/repositories/SiteDiaryHistoryRepository';
import { SiteDiaryHistoryService } from '@/services/SiteDiaryHistoryService';

export function createSiteDiaryManagementReadService(accessToken: string): SiteDiaryManagementReadService {
  const client = getSupabaseAuthenticatedClient(accessToken);
  return new SiteDiaryManagementReadService(new SiteDiaryManagementReadRepository(client));
}

export function createSiteDiaryHistoryService(accessToken: string): SiteDiaryHistoryService {
  const client = getSupabaseAuthenticatedClient(accessToken);
  return new SiteDiaryHistoryService(new SiteDiaryHistoryRepository(client));
}
