import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export const maxDuration = 60 // seconds — extend timeout for large datasets

// Reusable: same logic as /api/email/analytics/[id] but inlined here
async function getCampaignStats(campaignId: string) {
  // Use a high limit to bypass Supabase's default 1000-row cap.
  // Campaigns rarely exceed 10k sends; 100k is a safe upper bound.
  const { data: sends } = await supabaseAdmin
    .from("email_sends")
    .select("status, ses_message_id")
    .eq("campaign_id", campaignId)
    .limit(100000)

  const messageIds = (sends ?? [])
    .map(s => s.ses_message_id)
    .filter(Boolean) as string[]

  let opens = 0, clicks = 0, spam = 0, bounced = 0
  const BATCH = 5000
  for (let i = 0; i < messageIds.length; i += BATCH) {
    const { data: events } = await supabaseAdmin
      .from("email_events")
      .select("event_type")
      .in("ses_message_id", messageIds.slice(i, i + BATCH))
    for (const e of events ?? []) {
      if (e.event_type === "open")           opens++
      else if (e.event_type === "click")     clicks++
      else if (e.event_type === "complaint") spam++
      else if (e.event_type === "bounce")    bounced++
    }
  }

  return { total: sends?.length ?? 0, opens, clicks, spam, bounced }
}

export async function GET(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get("client_id")
    const fromDate = searchParams.get("from")  // "YYYY-MM-DD"
    const toDate   = searchParams.get("to")    // "YYYY-MM-DD"

    // ── 1. Fetch all sent campaigns ──────────────────────────────────────────
    let cq = supabaseAdmin
      .from("email_campaigns")
      .select("id, subject, sent_at")
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
    if (clientId)  cq = cq.eq("client_id", clientId)
    if (fromDate)  cq = cq.gte("sent_at", `${fromDate}T00:00:00`)
    if (toDate)    cq = cq.lte("sent_at", `${toDate}T23:59:59`)
    const { data: campaigns, error: cErr } = await cq
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })
    const sentCampaigns = campaigns ?? []

    // ── 2. Fetch all sent newsletters ────────────────────────────────────────
    let nq = supabaseAdmin
      .from("newsletter_sends")
      .select("id, subject, sent_at, sent_count, opens_count, clicks_count")
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
    if (clientId)  nq = nq.eq("client_id", clientId)
    if (fromDate)  nq = nq.gte("sent_at", `${fromDate}T00:00:00`)
    if (toDate)    nq = nq.lte("sent_at", `${toDate}T23:59:59`)
    const { data: newsletters, error: nErr } = await nq
    if (nErr) return NextResponse.json({ error: nErr.message }, { status: 500 })
    const sentNewsletters = newsletters ?? []

    // ── 3. Per-campaign stats — run in parallel batches of 5 ─────────────────
    // This is exactly what the analytics page does per-campaign; we just batch them.
    const CONCURRENT = 5
    const campaignStats: Array<{ id: string; subject: string; sentAt: string | null; total: number; opens: number; clicks: number; spam: number; bounced: number }> = []

    for (let i = 0; i < sentCampaigns.length; i += CONCURRENT) {
      const batch = sentCampaigns.slice(i, i + CONCURRENT)
      const results = await Promise.all(
        batch.map(c => getCampaignStats(c.id).then(s => ({ id: c.id, subject: c.subject, sentAt: c.sent_at ?? null, ...s })))
      )
      campaignStats.push(...results)
    }

    // ── 4. Build unified emails list ─────────────────────────────────────────
    const emails = [
      ...campaignStats.map(c => ({
        id: c.id, type: "campaign" as const,
        subject: c.subject, sentAt: c.sent_at,
        totalSent: c.total, totalOpened: c.opens, totalClicked: c.clicks,
        spamReports: c.spam, bounced: c.bounced,
      })),
      ...sentNewsletters.map(n => ({
        id: n.id, type: "newsletter" as const,
        subject: n.subject, sentAt: n.sent_at,
        totalSent: n.sent_count ?? 0, totalOpened: n.opens_count ?? 0, totalClicked: n.clicks_count ?? 0,
        spamReports: 0, bounced: 0,
      })),
    ].sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""))

    // ── 5. Summary ───────────────────────────────────────────────────────────
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

    // ── 6. Daily series ──────────────────────────────────────────────────────
    const allDates = [
      ...sentCampaigns.map(c => c.sent_at?.slice(0, 10)),
      ...sentNewsletters.map(n => n.sent_at?.slice(0, 10)),
    ].filter(Boolean) as string[]

    const earliest = allDates.length > 0 ? allDates.reduce((a, b) => (a < b ? a : b)) : null
    const today = new Date().toISOString().slice(0, 10)

    interface DayBucket { sent: number; opens: number; spam: number; bounced: number }
    const dayMap = new Map<string, DayBucket>()
    if (earliest) {
      const cur = new Date(earliest)
      while (cur.toISOString().slice(0, 10) <= today) {
        dayMap.set(cur.toISOString().slice(0, 10), { sent: 0, opens: 0, spam: 0, bounced: 0 })
        cur.setDate(cur.getDate() + 1)
      }
    }

    for (const c of campaignStats) {
      const date = c.sent_at?.slice(0, 10)
      if (!date || !dayMap.has(date)) continue
      const day = dayMap.get(date)!
      day.sent    += c.total
      day.opens   += c.opens
      day.spam    += c.spam
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
