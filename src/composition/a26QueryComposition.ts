import { getSupabaseAuthenticatedClient } from '@/lib/supabase';
import { A26ReadRepository } from '@/repositories/A26ReadRepository';
import { A26QueryService } from '@/services/A26QueryService';

/** Creates an A26 read service whose Supabase queries execute as the verified caller. */
export function createA26QueryService(accessToken: string): A26QueryService {
  const authenticatedClient = getSupabaseAuthenticatedClient(accessToken);
  return new A26QueryService(new A26ReadRepository(authenticatedClient));
}
