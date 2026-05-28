import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function GET(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("client_id")

  let query = supabaseAdmin
    .from("email_campaigns")
    .select("id, client_id, subject, status, scheduled_at, sent_at, created_at, tag_ids, sent_count, opens_count, clicks_count, sender_id, template_id, email_senders(from_email, from_name), email_templates(name)")
    .order("created_at", { ascending: false })

  if (clientId) query = query.eq("client_id", clientId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()
  const { client_id, sender_id, template_id, subject, scheduled_at, tag_ids } = body

  if (!client_id || !sender_id || !template_id || !subject || !Array.isArray(tag_ids) || tag_ids.length === 0) {
    return NextResponse.json({ error: "client_id, sender_id, template_id, subject, and at least one tag_id are required" }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("email_campaigns")
    .insert({ client_id, sender_id, template_id, subject, scheduled_at: scheduled_at ?? null, tag_ids })
    .select("*, email_senders(from_email, from_name), email_templates(name, html_body)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
