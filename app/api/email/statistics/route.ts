import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export const maxDuration = 60

// Chart-only endpoint: summary + daily series.
// Uses denormalized sent_count / opens_count columns from both tables — no JOINs needed.
export async function GET(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get("client_id")
    const fromDate = searchParams.get("from")
    const toDate   = searchParams.get("to")

    // ── 1. Fetch campaigns + newsletters with denormalized counts ─────────────
    let cq = supabaseAdmin
      .from("email_campaigns")
      .select("id, sent_at, sent_count, opens_count, clicks_count")
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .limit(10000)
    if (clientId) cq = cq.eq("client_id", clientId)
    if (fromDate) cq = cq.gte("sent_at", `${fromDate}T00:00:00`)
    if (toDate)   cq = cq.lte("sent_at", `${toDate}T23:59:59`)

    let nq = supabaseAdmin
      .from("newsletter_sends")
      .select("id, sent_at, sent_count, opens_count")
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .limit(10000)
    if (clientId) nq = nq.eq("client_id", clientId)
    if (fromDate) nq = nq.gte("sent_at", `${fromDate}T00:00:00`)
    if (toDate)   nq = nq.lte("sent_at", `${toDate}T23:59:59`)

    const [{ data: campaigns, error: cErr }, { data: newsletters, error: nErr }] =
      await Promise.all([cq, nq])

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })
    if (nErr) return NextResponse.json({ error: nErr.message }, { status: 500 })

    const sentCampaigns   = campaigns   ?? []
    const sentNewsletters = newsletters ?? []

    // ── 2. Summary totals ─────────────────────────────────────────────────────
    let totalSent = 0, totalOpened = 0
    for (const c of sentCampaigns) {
      totalSent   += c.sent_count  ?? 0
      totalOpened += c.opens_count ?? 0
    }
    for (const n of sentNewsletters) {
      totalSent   += n.sent_count  ?? 0
      totalOpened += n.opens_count ?? 0
    }

    const summary = {
      totalSent,
      avgOpenRate:   totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
      avgSpamRate:   0,
      avgBounceRate: 0,
    }

    // ── 3. Daily series ───────────────────────────────────────────────────────
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
      const day = dayMap.get(date)!
      day.sent  += c.sent_count  ?? 0
      day.opens += c.opens_count ?? 0
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
