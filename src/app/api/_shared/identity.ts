import { getSupabaseServerClient } from '@/lib/supabase';

export interface VerifiedIdentity {
  readonly actorId: string;
  readonly accessToken: string;
}

export async function extractVerifiedIdentity(request: Request): Promise<VerifiedIdentity | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) return null;
  const accessToken = authHeader.substring(7).trim();
  if (!accessToken) return null;
  try {
    const { data, error } = await getSupabaseServerClient().auth.getUser(accessToken);
    if (error || !data.user) return null;
    return { actorId: data.user.id, accessToken };
  } catch {
    return null;
  }
}

export async function extractIdentity(request: Request): Promise<string | null> {
  return (await extractVerifiedIdentity(request))?.actorId ?? null;
}
