import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.subject !== undefined) updates.subject = body.subject
  if (body.sender_id !== undefined) updates.sender_id = body.sender_id
  if (body.template_id !== undefined) updates.template_id = body.template_id
  if (body.list_id !== undefined) updates.list_id = body.list_id || null
  if (body.tag_ids !== undefined) updates.tag_ids = body.tag_ids ?? []
  if (body.scheduled_at !== undefined) updates.scheduled_at = body.scheduled_at

  const { data, error } = await supabaseAdmin
    .from("email_campaigns")
    .update(updates)
    .eq("id", params.id)
    .select("*, email_senders(from_email, from_name), email_templates(name, html_body), email_lists(name, contact_count)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  await supabaseAdmin.from("email_sends").delete().eq("campaign_id", params.id)
  const { error } = await supabaseAdmin.from("email_campaigns").delete().eq("id", params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
