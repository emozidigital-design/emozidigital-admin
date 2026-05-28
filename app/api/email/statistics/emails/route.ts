import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export const maxDuration = 30

// Paginated email list with correct stats per page.
// Only fetches sends + events for the campaigns on the current page.
export async function GET(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  try {
    const { searchParams } = new URL(req.url)
    const clientId  = searchParams.get("client_id")
    const fromDate  = searchParams.get("from")
    const toDate    = searchParams.get("to")
    const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const pageSize  = Math.min(50, Math.max(10, parseInt(searchParams.get("pageSize") ?? "10", 10)))
    const offset    = (page - 1) * pageSize

    // ── 1. Fetch campaigns + newsletters with total counts, in parallel ───────
    let cq = supabaseAdmin
      .from("email_campaigns")
      .select("id, subject, sent_at", { count: "exact" })
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
    if (clientId) cq = cq.eq("client_id", clientId)
    if (fromDate) cq = cq.gte("sent_at", `${fromDate}T00:00:00`)
    if (toDate)   cq = cq.lte("sent_at", `${toDate}T23:59:59`)

    let nq = supabaseAdmin
      .from("newsletter_sends")
      .select("id, subject, sent_at, sent_count, opens_count, clicks_count", { count: "exact" })
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
    if (clientId) nq = nq.eq("client_id", clientId)
    if (fromDate) nq = nq.gte("sent_at", `${fromDate}T00:00:00`)
    if (toDate)   nq = nq.lte("sent_at", `${toDate}T23:59:59`)

    const [
      { data: allCampaigns, count: campaignTotal, error: cErr },
      { data: allNewsletters, count: newsletterTotal, error: nErr },
    ] = await Promise.all([cq, nq])

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })
    if (nErr) return NextResponse.json({ error: nErr.message }, { status: 500 })

    // ── 2. Merge + sort all records, then slice to the requested page ─────────
    type EmailMeta =
      | { type: "campaign"; id: string; subject: string; sentAt: string | null }
      | { type: "newsletter"; id: string; subject: string; sentAt: string | null; sent_count: number; opens_count: number; clicks_count: number }

    const allMerged: EmailMeta[] = [
      ...(allCampaigns ?? []).map(c => ({
        type: "campaign" as const,
        id: c.id, subject: c.subject, sentAt: c.sent_at ?? null,
      })),
      ...(allNewsletters ?? []).map(n => ({
        type: "newsletter" as const,
        id: n.id, subject: n.subject, sentAt: n.sent_at,
        sent_count: n.sent_count ?? 0,
        opens_count: n.opens_count ?? 0,
        clicks_count: n.clicks_count ?? 0,
      })),
    ].sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""))

    const totalRecords = allMerged.length
    const totalPages   = Math.ceil(totalRecords / pageSize)
    const pageItems    = allMerged.slice(offset, offset + pageSize)

    const pageCampaigns   = pageItems.filter(e => e.type === "campaign")
    const pageNewsletters = pageItems.filter(e => e.type === "newsletter")
    const campaignIds     = pageCampaigns.map(c => c.id)

    // ── 3. Event counts only for the campaigns on this page ───────────────────
    interface CampaignCounts { total: number; opens: number; clicks: number; spam: number; bounced: number }
    const eventCounts = new Map<string, CampaignCounts>()

    if (campaignIds.length > 0) {
      // Try DB-side RPC first (requires scratch/sql_campaign_stats_fn.sql)
      const { data: rpcRows, error: rpcErr } = await supabaseAdmin
        .rpc("get_campaign_event_counts", { p_campaign_ids: campaignIds })

      if (!rpcErr && rpcRows) {
        for (const r of rpcRows as Array<{ campaign_id: string; total_sent: number; opens: number; clicks: number; spam: number; bounced: number }>) {
          eventCounts.set(r.campaign_id, {
            total: Number(r.total_sent), opens: Number(r.opens), clicks: Number(r.clicks),
            spam: Number(r.spam), bounced: Number(r.bounced),
          })
        }
        for (const id of campaignIds) {
          if (!eventCounts.has(id)) eventCounts.set(id, { total: 0, opens: 0, clicks: 0, spam: 0, bounced: 0 })
        }
      } else {
        // Slow fallback: fetch raw sends + events for this page's campaigns only
        const { data: sendRows } = await supabaseAdmin
          .from("email_sends")
          .select("campaign_id, ses_message_id")
          .in("campaign_id", campaignIds)
          .limit(1000000)

        const sends = sendRows ?? []
        const msgToCampaign = new Map<string, string>()
        const totals = new Map<string, number>()
        for (const s of sends) {
          if (s.ses_message_id) msgToCampaign.set(s.ses_message_id, s.campaign_id)
          totals.set(s.campaign_id, (totals.get(s.campaign_id) ?? 0) + 1)
        }
        for (const id of campaignIds) {
          eventCounts.set(id, { total: totals.get(id) ?? 0, opens: 0, clicks: 0, spam: 0, bounced: 0 })
        }

        const allMsgIds = sends.map(s => s.ses_message_id).filter(Boolean) as string[]
        const BATCH = 5000
        for (let i = 0; i < allMsgIds.length; i += BATCH) {
          const { data: events } = await supabaseAdmin
            .from("email_events")
            .select("ses_message_id, event_type")
            .in("ses_message_id", allMsgIds.slice(i, i + BATCH))
            .limit(1000000)
          for (const e of events ?? []) {
            const cid = msgToCampaign.get(e.ses_message_id)
            if (!cid) continue
            const c = eventCounts.get(cid)
            if (!c) continue
            if (e.event_type === "open")           c.opens++
            else if (e.event_type === "click")     c.clicks++
            else if (e.event_type === "complaint") c.spam++
            else if (e.event_type === "bounce")    c.bounced++
          }
        }
      }
    }

    // ── 4. Build response rows ────────────────────────────────────────────────
    const emails = pageItems.map(item => {
      if (item.type === "campaign") {
        const ev = eventCounts.get(item.id) ?? { total: 0, opens: 0, clicks: 0, spam: 0, bounced: 0 }
        return {
          id: item.id, type: "campaign" as const,
          subject: item.subject, sentAt: item.sentAt,
          totalSent: ev.total, totalOpened: ev.opens, totalClicked: ev.clicks,
          spamReports: ev.spam, bounced: ev.bounced,
        }
      } else {
        return {
          id: item.id, type: "newsletter" as const,
          subject: item.subject, sentAt: item.sentAt,
          totalSent: item.sent_count, totalOpened: item.opens_count, totalClicked: item.clicks_count,
          spamReports: 0, bounced: 0,
        }
      }
    })

    return NextResponse.json({ emails, totalRecords, totalPages, page, pageSize })
  } catch (err) {
    console.error("[statistics/emails]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
