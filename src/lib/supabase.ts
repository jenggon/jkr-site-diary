import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';
import { InfrastructureError } from './errors';

let browserClientInstance: SupabaseClient | null = null;
let serverClientInstance: SupabaseClient | null = null;
let serviceRoleClientInstance: SupabaseClient | null = null;

function installF1TradeMutationBridge(client: SupabaseClient): SupabaseClient {
  const originalFrom = client.from.bind(client);

  // F1 Golden Path compatibility bridge.
  // The legacy Site Diary screen still calls
  // `supabase.from('trade_library').insert(...)` when the user creates a manual
  // Trade. A27 correctly revoked direct authenticated mutation on that table.
  // Intercept only that exact browser write and route it through the canonical
  // authenticated API/DB-INVARIANT wrapper instead of reopening table grants.
  // Reads and every other Supabase relation remain untouched.
  (client as unknown as { from: SupabaseClient['from'] }).from = ((relation: string) => {
    const builder = originalFrom(relation);

    if (relation !== 'trade_library' || typeof window === 'undefined') {
      return builder;
    }

    return new Proxy(builder as object, {
      get(target, property, receiver) {
        if (property !== 'insert') {
          return Reflect.get(target, property, receiver);
        }

        return async (values: unknown) => {
          const payload = Array.isArray(values) ? values[0] : values;
          const response = await window.fetch('/api/trade-library', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const json = await response.json().catch(() => ({}));

          if (!response.ok) {
            return {
              data: null,
              error: {
                message: json?.error ?? 'Failed to create Trade',
              },
              count: null,
              status: response.status,
              statusText: response.statusText,
            };
          }

          return {
            data: json?.data ? [json.data] : null,
            error: null,
            count: null,
            status: response.status,
            statusText: response.statusText,
          };
        };
      },
    }) as ReturnType<SupabaseClient['from']>;
  }) as SupabaseClient['from'];

  return client;
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClientInstance) {
    browserClientInstance = installF1TradeMutationBridge(
      createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
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
