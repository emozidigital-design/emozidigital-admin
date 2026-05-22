import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function GET(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const clientId = req.nextUrl.searchParams.get("client_id")
  if (!clientId) return NextResponse.json({ error: "client_id required" }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from("email_import_logs")
    .select("id, file_name, delimiter, total_rows, imported, invalid, status, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
