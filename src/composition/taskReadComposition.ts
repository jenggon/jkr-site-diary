import { getSupabaseAuthenticatedClient } from '@/lib/supabase';
import { TaskReadRepository } from '@/repositories/TaskReadRepository';

export function createTaskReadRepository(accessToken: string): TaskReadRepository {
  const client = getSupabaseAuthenticatedClient(accessToken);
  return new TaskReadRepository(client);
}
