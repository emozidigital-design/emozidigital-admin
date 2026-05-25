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
    .select(
      "id, subject, recipient_type, status, sent_count, recipient_count, failed_count, opens_count, clicks_count, sent_at, created_at, blog_post_id, sender_id, list_id, tag_ids, trending_post_ids, newsletter_template_id, scheduled_at"
    )
    .order("created_at", { ascending: false })
    .limit(100)

  if (clientId) query = query.eq("client_id", clientId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()
  const {
    blog_post_id,
    sender_id,
    subject,
    client_id,
    recipient_type,
    list_id,
    status = "draft",
    scheduled_at,
  } = body
  const tag_ids: string[] = Array.isArray(body.tag_ids) ? body.tag_ids : []
  const trending_post_ids: string[] = Array.isArray(body.trending_post_ids) ? body.trending_post_ids : []
  const newsletter_template_id: string | null = body.newsletter_template_id || null

  if (!blog_post_id || !subject) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("newsletter_sends")
    .insert({
      client_id: client_id || null,
      blog_post_id,
      sender_id: sender_id || null,
      subject,
      recipient_type: recipient_type || "list",
      list_id: list_id || null,
      tag_ids,
      trending_post_ids,
      newsletter_template_id,
      status,
      scheduled_at: scheduled_at || null,
      sent_count: 0,
      failed_count: 0,
    })
    .select("id, subject, status, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
