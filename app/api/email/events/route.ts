import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function GET(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { searchParams } = new URL(req.url)
  const eventType = searchParams.get("type")

  let query = supabaseAdmin
    .from("email_events")
    .select("id, ses_message_id, event_type, processed_at")
    .order("processed_at", { ascending: false })
    .limit(200)

  if (eventType) query = query.eq("event_type", eventType)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
