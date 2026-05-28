import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export const maxDuration = 60

// Chart-only endpoint: summary + daily series.
// Avoids the slow email_sends→email_events join by using:
//   - newsletter_sends.sent_count / opens_count (already denormalized)
//   - email_sends count per campaign (just a count, no event join)
//   - email_events aggregate only for summary open/spam/bounce rates
export async function GET(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get("client_id")
    const fromDate = searchParams.get("from")
    const toDate   = searchParams.get("to")

    // ── 1. Campaigns + newsletters metadata (IDs + dates only) ───────────────
    let cq = supabaseAdmin
      .from("email_campaigns")
      .select("id, sent_at")
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
    if (clientId) cq = cq.eq("client_id", clientId)
    if (fromDate) cq = cq.gte("sent_at", `${fromDate}T00:00:00`)
    if (toDate)   cq = cq.lte("sent_at", `${toDate}T23:59:59`)

    let nq = supabaseAdmin
      .from("newsletter_sends")
      .select("id, sent_at, sent_count, opens_count")
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
    const campaignIds     = sentCampaigns.map(c => c.id)

    // ── 2. Campaign send counts + event summary via RPC (fast) ────────────────
    // If RPC not deployed, fall back to a simple count-only query (no event join).
    // Summary open/spam/bounce rates use newsletter denormalized counts + RPC data.
    interface CampaignCounts { total: number; opens: number; spam: number; bounced: number }
    const eventCounts = new Map<string, CampaignCounts>()

    if (campaignIds.length > 0) {
      const { data: rpcRows, error: rpcErr } = await supabaseAdmin
        .rpc("get_campaign_event_counts", { p_campaign_ids: campaignIds })

      if (!rpcErr && rpcRows) {
        // RPC deployed — full accurate counts
        for (const r of rpcRows as Array<{ campaign_id: string; total_sent: number; opens: number; clicks: number; spam: number; bounced: number }>) {
          eventCounts.set(r.campaign_id, {
            total: Number(r.total_sent), opens: Number(r.opens),
            spam: Number(r.spam), bounced: Number(r.bounced),
          })
        }
        for (const id of campaignIds) {
          if (!eventCounts.has(id)) eventCounts.set(id, { total: 0, opens: 0, spam: 0, bounced: 0 })
        }
      } else {
        // RPC not deployed — fast fallback: count sends only, skip event join
        // Open/spam/bounce rates will be 0 for campaigns (newsletters still accurate via denormalized cols)
        const BATCH = 200 // keep IN clause small
        for (let i = 0; i < campaignIds.length; i += BATCH) {
          const batch = campaignIds.slice(i, i + BATCH)
          const { data: sendRows } = await supabaseAdmin
            .from("email_sends")
            .select("campaign_id")
            .in("campaign_id", batch)
            .limit(1000000)
          for (const s of sendRows ?? []) {
            const cur = eventCounts.get(s.campaign_id) ?? { total: 0, opens: 0, spam: 0, bounced: 0 }
            cur.total++
            eventCounts.set(s.campaign_id, cur)
          }
        }
        for (const id of campaignIds) {
          if (!eventCounts.has(id)) eventCounts.set(id, { total: 0, opens: 0, spam: 0, bounced: 0 })
        }
      }
    }

    // ── 3. Summary totals ─────────────────────────────────────────────────────
    let totalSent = 0, totalOpened = 0, totalSpam = 0, totalBounced = 0
    eventCounts.forEach(c => {
      totalSent    += c.total
      totalOpened  += c.opens
      totalSpam    += c.spam
      totalBounced += c.bounced
    })
    for (const n of sentNewsletters) {
      totalSent   += n.sent_count  ?? 0
      totalOpened += n.opens_count ?? 0
    }

    const summary = {
      totalSent,
      avgOpenRate:   totalSent > 0 ? (totalOpened  / totalSent) * 100 : 0,
      avgSpamRate:   totalSent > 0 ? (totalSpam    / totalSent) * 100 : 0,
      avgBounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
    }

    // ── 4. Daily series ───────────────────────────────────────────────────────
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

    for (const c of sentCampaigns) {
      const date = c.sent_at?.slice(0, 10)
      if (!date || !dayMap.has(date)) continue
      const counts = eventCounts.get(c.id)
      if (!counts) continue
      const day = dayMap.get(date)!
      day.sent    += counts.total
      day.opens   += counts.opens
      day.spam    += counts.spam
      day.bounced += counts.bounced
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

    const res = NextResponse.json({ summary, dailySeries })
    res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=300")
    return res
  } catch (err) {
    console.error("[statistics]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
