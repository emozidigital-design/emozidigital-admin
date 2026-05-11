import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getAgentBazarSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.AGENTBAZAR_SUPABASE_URL;
    const key = process.env.AGENTBAZAR_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("AGENTBAZAR_SUPABASE_URL and AGENTBAZAR_SUPABASE_SERVICE_ROLE_KEY must be set.");
    _client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  }
  return _client;
}
