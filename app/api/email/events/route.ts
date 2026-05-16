import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

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
