// Supabase Realtime client for the web. Replaces the previous 30s polling
// loop with a single WebSocket that streams postgres_changes events from the
// same database the mobile app writes to.
//
// Auth model: the web's existing access token is already a valid Supabase
// JWT (HS256, SUPABASE_JWT_SECRET, aud='authenticated'). We pass it through
// supabase.realtime.setAuth(), and RLS policies on items/folders/tags/etc.
// scope every event to the user's team.

import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { apiGet, getAccessToken } from './api';

interface RealtimeConfig {
  url: string;
  anonKey: string;
}

let configPromise: Promise<RealtimeConfig> | null = null;
let clientPromise: Promise<SupabaseClient> | null = null;

function fetchConfig(): Promise<RealtimeConfig> {
  if (!configPromise) {
    configPromise = apiGet<RealtimeConfig>('/api/realtime/config').catch(err => {
      configPromise = null; // allow retry on next attempt
      throw err;
    });
  }
  return configPromise;
}

async function getClient(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const cfg = await fetchConfig();
      const client = createClient(cfg.url, cfg.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        realtime: { params: { eventsPerSecond: 10 } },
      });
      return client;
    })().catch(err => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

/**
 * Update the JWT used by realtime subscriptions. Call after login, after
 * a token refresh, and on logout (pass null to drop privileges).
 */
export async function setRealtimeAuth(token: string | null): Promise<void> {
  try {
    const client = await getClient();
    client.realtime.setAuth(token ?? '');
  } catch {
    // realtime config endpoint unavailable — caller has fallback paths
  }
}

interface SubscribeOptions {
  teamId: string;
  tables: ReadonlyArray<string>;
  /** Debounced callback fired when ANY of the listed tables changes for this team. */
  onChange: () => void;
  /** Optional: include rows where team_id IS NULL too (default false). */
  includeOrphans?: boolean;
}

/**
 * Subscribe to postgres_changes for a set of tables, scoped by team_id.
 * Returns an unsubscribe function. Multiple events in flight coalesce into
 * a single onChange() callback debounced at ~250ms.
 */
export async function subscribeTeamChanges(opts: SubscribeOptions): Promise<() => void> {
  const client = await getClient();
  client.realtime.setAuth(getAccessToken() ?? '');

  const channelName = `team:${opts.teamId}:${Math.random().toString(36).slice(2, 8)}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let channel: RealtimeChannel = client.channel(channelName) as any;

  let debounceTimer: number | null = null;
  const fire = () => {
    if (debounceTimer != null) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      debounceTimer = null;
      opts.onChange();
    }, 250);
  };

  for (const table of opts.tables) {
    // The library's .on signature for 'postgres_changes' is conditionally
    // typed; cast to keep this call concise.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel = (channel.on as any)(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter: `team_id=eq.${opts.teamId}`,
      },
      fire,
    );
  }

  channel.subscribe();

  return () => {
    if (debounceTimer != null) window.clearTimeout(debounceTimer);
    void client.removeChannel(channel);
  };
}

/**
 * Tear down the client entirely (used on logout). After this, the next
 * subscribe will re-fetch config and create a fresh client.
 */
export async function disposeRealtime(): Promise<void> {
  if (!clientPromise) return;
  try {
    const c = await clientPromise;
    await c.removeAllChannels();
  } catch { /* ignore */ }
  clientPromise = null;
  configPromise = null;
}
