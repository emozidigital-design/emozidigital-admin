import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()
  const { subject: overrideSubject, scheduled_at } = body

  const { data: campaign, error: cErr } = await supabaseAdmin
    .from("email_campaigns")
    .select("id, client_id, sender_id, template_id, tag_ids, subject")
    .eq("id", params.id)
    .single()

  if (cErr || !campaign) return NextResponse.json({ error: "campaign not found" }, { status: 404 })

  const subject = overrideSubject ?? campaign.subject

  // If scheduling, create a draft campaign record and return immediately (no send)
  if (scheduled_at) {
    const { data: newCampaign, error: createErr } = await supabaseAdmin
      .from("email_campaigns")
      .insert({
        client_id: campaign.client_id,
        sender_id: campaign.sender_id,
        template_id: campaign.template_id,
        tag_ids: campaign.tag_ids ?? [],
        subject,
        status: "scheduled",
        scheduled_at,
      })
      .select("id")
      .single()
    if (createErr || !newCampaign) return NextResponse.json({ error: "failed to create resend campaign" }, { status: 500 })
    return NextResponse.json({ scheduled: true, id: newCampaign.id })
  }

  const vpsUrl = process.env.VPS_SENDER_URL
  const secret = process.env.INTERNAL_SECRET
  if (!vpsUrl || !secret) {
    return NextResponse.json({ error: "VPS_SENDER_URL or INTERNAL_SECRET not configured" }, { status: 500 })
  }

  const vpsRes = await fetch(`${vpsUrl}/resend-campaign-unopened`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": secret },
    body: JSON.stringify({ campaignId: params.id, overrideSubject }),
  })

  if (!vpsRes.ok) {
    const text = await vpsRes.text()
    return NextResponse.json({ error: `VPS error: ${text}` }, { status: 502 })
  }

  return NextResponse.json({ ok: true, message: "Resend started" })
}
