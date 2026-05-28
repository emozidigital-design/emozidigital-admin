import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export const maxDuration = 60

// Use a DB-side aggregation function if available; avoids pulling raw event rows into Node.
// Run scratch/sql_campaign_stats_fn.sql in Supabase once to enable this path.
async function getCampaignEventCounts(
  campaignIds: string[]
): Promise<Map<string, { total: number; opens: number; clicks: number; spam: number; bounced: number }>> {
  const counts = new Map<string, { total: number; opens: number; clicks: number; spam: number; bounced: number }>()
  if (campaignIds.length === 0) return counts

  // ── Fast path: DB-side aggregation (no raw rows shipped to Node) ──────────
  const { data: rpcRows, error: rpcErr } = await supabaseAdmin
    .rpc("get_campaign_event_counts", { p_campaign_ids: campaignIds })

  if (!rpcErr && rpcRows) {
    for (const r of rpcRows as Array<{ campaign_id: string; total_sent: number; opens: number; clicks: number; spam: number; bounced: number }>) {
      counts.set(r.campaign_id, {
        total: Number(r.total_sent),
        opens: Number(r.opens),
        clicks: Number(r.clicks),
        spam: Number(r.spam),
        bounced: Number(r.bounced),
      })
    }
    // Fill zero counts for campaigns with no sends
    for (const id of campaignIds) {
      if (!counts.has(id)) counts.set(id, { total: 0, opens: 0, clicks: 0, spam: 0, bounced: 0 })
    }
    return counts
  }

  // ── Slow path: fetch raw sends + events if RPC not yet deployed ───────────
  const { data: sendRows } = await supabaseAdmin
    .from("email_sends")
    .select("campaign_id, ses_message_id")
    .in("campaign_id", campaignIds)
    .limit(1000000)

  const sends = sendRows ?? []
  const msgToCampaign = new Map<string, string>()
  const campaignTotals = new Map<string, number>()

  for (const s of sends) {
    if (s.ses_message_id) msgToCampaign.set(s.ses_message_id, s.campaign_id)
    campaignTotals.set(s.campaign_id, (campaignTotals.get(s.campaign_id) ?? 0) + 1)
  }
  for (const id of campaignIds) {
    counts.set(id, { total: campaignTotals.get(id) ?? 0, opens: 0, clicks: 0, spam: 0, bounced: 0 })
  }

  const allMessageIds = sends.map(s => s.ses_message_id).filter(Boolean) as string[]
  const BATCH = 5000
  for (let i = 0; i < allMessageIds.length; i += BATCH) {
    const { data: events } = await supabaseAdmin
      .from("email_events")
      .select("ses_message_id, event_type")
      .in("ses_message_id", allMessageIds.slice(i, i + BATCH))
      .limit(1000000)

    for (const e of events ?? []) {
      const cid = msgToCampaign.get(e.ses_message_id)
      if (!cid) continue
      const c = counts.get(cid)
      if (!c) continue
      if (e.event_type === "open")           c.opens++
      else if (e.event_type === "click")     c.clicks++
      else if (e.event_type === "complaint") c.spam++
      else if (e.event_type === "bounce")    c.bounced++
    }
  }

  return counts
}

export async function GET(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get("client_id")
    const fromDate = searchParams.get("from")
    const toDate   = searchParams.get("to")

    // ── 1. Campaigns + newsletters fetched in parallel ───────────────────────
    let cq = supabaseAdmin
      .from("email_campaigns")
      .select("id, subject, sent_at")
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
    if (clientId) cq = cq.eq("client_id", clientId)
    if (fromDate) cq = cq.gte("sent_at", `${fromDate}T00:00:00`)
    if (toDate)   cq = cq.lte("sent_at", `${toDate}T23:59:59`)

    let nq = supabaseAdmin
      .from("newsletter_sends")
      .select("id, subject, sent_at, sent_count, opens_count, clicks_count")
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
    if (clientId) nq = nq.eq("client_id", clientId)
    if (fromDate) nq = nq.gte("sent_at", `${fromDate}T00:00:00`)
    if (toDate)   nq = nq.lte("sent_at", `${toDate}T23:59:59`)

    const [{ data: campaigns, error: cErr }, { data: newsletters, error: nErr }] =
      await Promise.all([cq, nq])

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })
    if (nErr) return NextResponse.json({ error: nErr.message }, { status: 500 })

    const sentCampaigns   = campaigns   ?? []
    const sentNewsletters = newsletters ?? []

    // ── 2. Event counts (DB aggregate or fallback) ───────────────────────────
    const eventCounts = await getCampaignEventCounts(sentCampaigns.map(c => c.id))

    // ── 3. Build unified emails list ─────────────────────────────────────────
    const campaignRows = sentCampaigns.map(c => {
      const ev = eventCounts.get(c.id) ?? { total: 0, opens: 0, clicks: 0, spam: 0, bounced: 0 }
      return {
        id: c.id, type: "campaign" as const,
        subject: c.subject, sentAt: c.sent_at ?? null,
        totalSent: ev.total, totalOpened: ev.opens, totalClicked: ev.clicks,
        spamReports: ev.spam, bounced: ev.bounced,
      }
    })

    const newsletterRows = sentNewsletters.map(n => ({
      id: n.id, type: "newsletter" as const,
      subject: n.subject, sentAt: n.sent_at,
      totalSent: n.sent_count ?? 0, totalOpened: n.opens_count ?? 0, totalClicked: n.clicks_count ?? 0,
      spamReports: 0, bounced: 0,
    }))

    const emails = [...campaignRows, ...newsletterRows]
      .sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""))

    // ── 4. Summary ───────────────────────────────────────────────────────────
    const totalSent    = emails.reduce((a, e) => a + e.totalSent, 0)
    const totalOpened  = emails.reduce((a, e) => a + e.totalOpened, 0)
    const totalSpam    = emails.reduce((a, e) => a + e.spamReports, 0)
    const totalBounced = emails.reduce((a, e) => a + e.bounced, 0)

    const summary = {
      totalSent,
      avgOpenRate:   totalSent > 0 ? (totalOpened  / totalSent) * 100 : 0,
      avgSpamRate:   totalSent > 0 ? (totalSpam    / totalSent) * 100 : 0,
      avgBounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
    }

    // ── 5. Daily series ──────────────────────────────────────────────────────
    const allDates = [
      ...sentCampaigns.map(c  => c.sent_at?.slice(0, 10)),
      ...sentNewsletters.map(n => n.sent_at?.slice(0, 10)),
    ].filter(Boolean) as string[]

    const earliest = allDates.length > 0 ? allDates.reduce((a, b) => (a < b ? a : b)) : null
    const today    = new Date().toISOString().slice(0, 10)

    interface DayBucket { sent: number; opens: number; spam: number; bounced: number }
    const dayMap = new Map<string, DayBucket>()
    if (earliest) {
      const cur = new Date(earliest)
      while (cur.toISOString().slice(0, 10) <= today) {
        dayMap.set(cur.toISOString().slice(0, 10), { sent: 0, opens: 0, spam: 0, bounced: 0 })
        cur.setDate(cur.getDate() + 1)
      }
    }

    for (const c of campaignRows) {
      const date = c.sentAt?.slice(0, 10)
      if (!date || !dayMap.has(date)) continue
      const day = dayMap.get(date)!
      day.sent    += c.totalSent
      day.opens   += c.totalOpened
      day.spam    += c.spamReports
      day.bounced += c.bounced
    }
    for (const n of sentNewsletters) {
      const date = n.sent_at?.slice(0, 10)
      if (!date || !dayMap.has(date)) continue
      const day = dayMap.get(date)!
      day.sent  += n.sent_count  ?? 0
      day.opens += n.opens_count ?? 0
    }

    const dailySeries = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date,
        sent: d.sent,
        openPct:   d.sent > 0 ? (d.opens   / d.sent) * 100 : 0,
        spamPct:   d.sent > 0 ? (d.spam    / d.sent) * 100 : 0,
        bouncePct: d.sent > 0 ? (d.bounced / d.sent) * 100 : 0,
      }))

    return NextResponse.json({ summary, dailySeries, emails })
  } catch (err) {
    console.error("[statistics]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
