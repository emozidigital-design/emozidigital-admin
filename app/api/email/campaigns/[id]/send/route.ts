import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const campaignId = params.id

  const { data: campaign, error: cErr } = await supabaseAdmin
    .from("email_campaigns")
    .select("id, status")
    .eq("id", campaignId)
    .single()

  if (cErr || !campaign) return NextResponse.json({ error: "campaign not found" }, { status: 404 })
  if (campaign.status !== "draft" && campaign.status !== "scheduled") {
    return NextResponse.json({ error: "campaign already sent" }, { status: 409 })
  }

  const vpsUrl = process.env.VPS_SENDER_URL
  const secret = process.env.INTERNAL_SECRET
  if (!vpsUrl || !secret) {
    return NextResponse.json({ error: "VPS_SENDER_URL or INTERNAL_SECRET not configured" }, { status: 500 })
  }

  const vpsRes = await fetch(`${vpsUrl}/send-campaign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": secret },
    body: JSON.stringify({ campaignId }),
  })

  if (!vpsRes.ok) {
    const text = await vpsRes.text()
    return NextResponse.json({ error: `VPS error: ${text}` }, { status: 502 })
  }

  return NextResponse.json({ ok: true, message: "Send started" })
}
