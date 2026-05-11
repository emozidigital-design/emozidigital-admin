import { createClient } from "@supabase/supabase-js";

export const agentBazarSupabase = createClient(
  process.env.AGENTBAZAR_SUPABASE_URL!,
  process.env.AGENTBAZAR_SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
