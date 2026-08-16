import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';
import { InfrastructureError } from './errors';

let browserClientInstance: SupabaseClient | null = null;
let serverClientInstance: SupabaseClient | null = null;
let serviceRoleClientInstance: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClientInstance) {
    browserClientInstance = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return browserClientInstance;
}

export function getSupabaseServerClient(): SupabaseClient {
  if (!serverClientInstance) {
    serverClientInstance = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
        },
      }
    );
  }
  return serverClientInstance;
}

export function getSupabaseAuthenticatedClient(accessToken: string): SupabaseClient {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function getSupabaseServiceRoleClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new InfrastructureError(
      'Service Role Supabase client cannot be instantiated in a browser environment'
    );
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new InfrastructureError(
      'SUPABASE_SERVICE_ROLE_KEY environment variable is missing'
    );
  }

  if (!serviceRoleClientInstance) {
    serviceRoleClientInstance = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
        },
      }
    );
  }
  return serviceRoleClientInstance;
}

export const supabase: SupabaseClient = getSupabaseBrowserClient();
