import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { id } = params
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if (body.subject !== undefined) updates.subject = body.subject
  if (body.sender_id !== undefined) updates.sender_id = body.sender_id || null
  if (body.list_id !== undefined) updates.list_id = body.list_id || null
  if (body.recipient_type !== undefined) updates.recipient_type = body.recipient_type
  if (body.tag_ids !== undefined) updates.tag_ids = Array.isArray(body.tag_ids) ? body.tag_ids : []
  if (body.trending_post_ids !== undefined) updates.trending_post_ids = Array.isArray(body.trending_post_ids) ? body.trending_post_ids : []
  if (body.newsletter_template_id !== undefined) updates.newsletter_template_id = body.newsletter_template_id || null
  if (body.blog_post_id !== undefined) updates.blog_post_id = body.blog_post_id
  if (body.status !== undefined) updates.status = body.status
  if (body.scheduled_at !== undefined) updates.scheduled_at = body.scheduled_at || null

  const { data, error } = await supabaseAdmin
    .from("newsletter_sends")
    .update(updates)
    .eq("id", id)
    .select("id, subject, status")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { id } = params

  const { error: sendsError } = await supabaseAdmin
    .from("email_sends")
    .delete()
    .eq("newsletter_send_id", id)

  if (sendsError) return NextResponse.json({ error: sendsError.message }, { status: 500 })

  const { error } = await supabaseAdmin
    .from("newsletter_sends")
    .delete()
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
