import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()
  const { column_name, label } = body as { column_name?: string; label?: string }

  if (!column_name || !label) {
    return NextResponse.json({ error: "column_name and label required" }, { status: 400 })
  }

  // Enforce safe column naming: only lowercase letters, digits, underscores; must start with custom_
  if (!/^custom_[a-z0-9_]+$/.test(column_name)) {
    return NextResponse.json({ error: "column_name must match custom_[a-z0-9_]+" }, { status: 400 })
  }

  // Use execute_sql RPC if available, otherwise use raw Supabase query
  // We use the postgres extension via supabaseAdmin to run DDL
  const { error } = await supabaseAdmin.rpc("exec_sql" as never, {
    sql: `ALTER TABLE email_contacts ADD COLUMN IF NOT EXISTS "${column_name}" text;`,
  })

  if (error) {
    // If exec_sql RPC doesn't exist, fall back — caller should run the migration manually
    if (error.code === "PGRST202" || error.message?.includes("exec_sql")) {
      return NextResponse.json({
        ok: false,
        manual: true,
        sql: `ALTER TABLE email_contacts ADD COLUMN IF NOT EXISTS "${column_name}" text;`,
        message: "Run the SQL above in your Supabase SQL editor to add this column.",
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, column_name, label })
}
