import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { data: orig, error: e1 } = await supabaseAdmin
    .from("email_campaigns")
    .select("*")
    .eq("id", params.id)
    .single()

  if (e1 || !orig) return NextResponse.json({ error: "campaign not found" }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from("email_campaigns")
    .insert({
      client_id: orig.client_id,
      sender_id: orig.sender_id,
      template_id: orig.template_id,
      list_id: orig.list_id,
      subject: `Copy of ${orig.subject}`,
      status: "draft",
      scheduled_at: null,
      sent_at: null,
    })
    .select("*, email_senders(from_email, from_name), email_templates(name, html_body), email_lists(name, contact_count)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
