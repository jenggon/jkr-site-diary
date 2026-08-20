import { getSupabaseAuthenticatedClient } from '@/lib/supabase';
import { SiteDiaryPrintReadRepository } from '@/repositories/SiteDiaryPrintReadRepository';

export function createSiteDiaryPrintReadRepository(accessToken: string): SiteDiaryPrintReadRepository {
  const client = getSupabaseAuthenticatedClient(accessToken);
  return new SiteDiaryPrintReadRepository(client);
}
