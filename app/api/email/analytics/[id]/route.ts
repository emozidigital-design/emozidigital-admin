import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

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

  // Count opens/clicks/complaints via a single aggregation query — no row limit
  let opens = 0, clicks = 0, complaints = 0
  if (messageIds.length > 0) {
    // Fetch in batches of 5000 to stay within Supabase's IN clause limits
    const BATCH = 5000
    for (let i = 0; i < messageIds.length; i += BATCH) {
      const { data: events } = await supabaseAdmin
        .from("email_events")
        .select("event_type")
        .in("ses_message_id", messageIds.slice(i, i + BATCH))
      for (const e of events ?? []) {
        if (e.event_type === "open") opens++
        else if (e.event_type === "click") clicks++
        else if (e.event_type === "complaint") complaints++
      }
    }
  }

  return NextResponse.json({
    total: sends?.length ?? 0,
    ...totals,
    opens,
    clicks,
    complaints,
  })
}
