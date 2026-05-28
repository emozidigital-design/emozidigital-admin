import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { data: orig, error: e1 } = await supabaseAdmin
    .from("newsletter_sends")
    .select("*")
    .eq("id", params.id)
    .single()

  if (e1 || !orig) return NextResponse.json({ error: "newsletter not found" }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from("newsletter_sends")
    .insert({
      client_id: orig.client_id,
      blog_post_id: orig.blog_post_id,
      sender_id: orig.sender_id,
      subject: `[D] ${orig.subject}`,
      recipient_type: orig.recipient_type,
      list_id: orig.list_id,
      tag_ids: orig.tag_ids ?? [],
      trending_post_ids: orig.trending_post_ids ?? [],
      newsletter_template_id: orig.newsletter_template_id,
      status: "draft",
      scheduled_at: null,
      sent_count: 0,
      failed_count: 0,
      recipient_count: 0,
      opens_count: 0,
      clicks_count: 0,
    })
    .select("id, subject, status, created_at, tag_ids, sent_count, opens_count, clicks_count, recipient_count, failed_count, sent_at, scheduled_at, blog_post_id, sender_id, list_id, trending_post_ids, newsletter_template_id, recipient_type")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
