import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function GET(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("client_id")

  let query = supabaseAdmin
    .from("newsletter_sends")
    .select("id, subject, recipient_type, status, sent_count, failed_count, sent_at, created_at, blog_post_id")
    .order("created_at", { ascending: false })
    .limit(50)

  if (clientId) query = query.eq("client_id", clientId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
