import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const campaignId = params.id

  // Send stats per status
  const { data: sends } = await supabaseAdmin
    .from("email_sends")
    .select("status, ses_message_id")
    .eq("campaign_id", campaignId)

  const totals = { sent: 0, delivered: 0, bounced: 0, failed: 0 }
  const messageIds: string[] = []

  for (const s of sends ?? []) {
    if (s.status in totals) totals[s.status as keyof typeof totals]++
    if (s.ses_message_id) messageIds.push(s.ses_message_id)
  }

  // Event stats (opens / clicks) from SNS events
  const { data: events } = await supabaseAdmin
    .from("email_events")
    .select("event_type")
    .in("ses_message_id", messageIds.slice(0, 1000)) // guard against huge IN clause

  const opens = events?.filter(e => e.event_type === "open").length ?? 0
  const clicks = events?.filter(e => e.event_type === "click").length ?? 0
  const complaints = events?.filter(e => e.event_type === "complaint").length ?? 0

  return NextResponse.json({
    total: sends?.length ?? 0,
    ...totals,
    opens,
    clicks,
    complaints,
  })
}
