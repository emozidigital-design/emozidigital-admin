import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get("client_id")
    const fromDate = searchParams.get("from")
    const toDate   = searchParams.get("to")
    const page     = Math.max(1, parseInt(searchParams.get("page")     ?? "1",  10))
    const pageSize = Math.min(50, Math.max(10, parseInt(searchParams.get("pageSize") ?? "10", 10)))

    // ── 1. Get total counts (cheap — no data rows) ────────────────────────────
    let cCountQ = supabaseAdmin
      .from("email_campaigns")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
    if (clientId) cCountQ = cCountQ.eq("client_id", clientId)
    if (fromDate) cCountQ = cCountQ.gte("sent_at", `${fromDate}T00:00:00`)
    if (toDate)   cCountQ = cCountQ.lte("sent_at", `${toDate}T23:59:59`)

    let nCountQ = supabaseAdmin
      .from("newsletter_sends")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
    if (clientId) nCountQ = nCountQ.eq("client_id", clientId)
    if (fromDate) nCountQ = nCountQ.gte("sent_at", `${fromDate}T00:00:00`)
    if (toDate)   nCountQ = nCountQ.lte("sent_at", `${toDate}T23:59:59`)

    // ── 2. Fetch enough rows to fill this page from each table ────────────────
    // Strategy: fetch (offset + pageSize) rows from each, merge+sort, slice.
    // Capped at 500 to prevent runaway queries on deep page navigation.
    const fetchLimit = Math.min(page * pageSize, 500)

    let cq = supabaseAdmin
      .from("email_campaigns")
      .select("id, subject, sent_at")
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .limit(fetchLimit + 1) // +1 to detect truncation; sliced to fetchLimit after merge
    if (clientId) cq = cq.eq("client_id", clientId)
    if (fromDate) cq = cq.gte("sent_at", `${fromDate}T00:00:00`)
    if (toDate)   cq = cq.lte("sent_at", `${toDate}T23:59:59`)

    let nq = supabaseAdmin
      .from("newsletter_sends")
      .select("id, subject, sent_at, sent_count, opens_count, clicks_count")
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .limit(fetchLimit + 1)
    if (clientId) nq = nq.eq("client_id", clientId)
    if (fromDate) nq = nq.gte("sent_at", `${fromDate}T00:00:00`)
    if (toDate)   nq = nq.lte("sent_at", `${toDate}T23:59:59`)

    const [
      { data: campaigns, error: cErr },
      { data: newsletters, error: nErr },
      { count: campaignCount, error: ccErr },
      { count: newsletterCount, error: ncErr },
    ] = await Promise.all([cq, nq, cCountQ, nCountQ])

    if (cErr)  return NextResponse.json({ error: cErr.message },  { status: 500 })
    if (nErr)  return NextResponse.json({ error: nErr.message },  { status: 500 })
    if (ccErr) return NextResponse.json({ error: ccErr.message }, { status: 500 })
    if (ncErr) return NextResponse.json({ error: ncErr.message }, { status: 500 })

    const totalRecords = (campaignCount ?? 0) + (newsletterCount ?? 0)
    const totalPages   = Math.ceil(totalRecords / pageSize)
    const offset       = (page - 1) * pageSize

    // Merge + sort by sentAt desc, then slice the page window
    type EmailMeta =
      | { type: "campaign";    id: string; subject: string; sentAt: string | null }
      | { type: "newsletter";  id: string; subject: string; sentAt: string | null;
          sent_count: number; opens_count: number; clicks_count: number }

    const merged: EmailMeta[] = [
      ...(campaigns   ?? []).map(c => ({ type: "campaign"   as const, id: c.id, subject: c.subject, sentAt: c.sent_at ?? null })),
      ...(newsletters ?? []).map(n => ({ type: "newsletter" as const, id: n.id, subject: n.subject, sentAt: n.sent_at,
        sent_count: n.sent_count ?? 0, opens_count: n.opens_count ?? 0, clicks_count: n.clicks_count ?? 0 })),
    ].sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""))

    const pageItems    = merged.slice(offset, offset + pageSize)
    const campaignIds  = pageItems.filter(e => e.type === "campaign").map(e => e.id)

    // ── 3. Event counts for campaigns on this page only ───────────────────────
    interface Counts { total: number; opens: number; clicks: number; spam: number; bounced: number }
    const eventCounts = new Map<string, Counts>()

    if (campaignIds.length > 0) {
      // Fast path: DB-side aggregation (run scratch/sql_campaign_stats_fn.sql once in Supabase)
      const { data: rpcRows, error: rpcErr } = await supabaseAdmin
        .rpc("get_campaign_event_counts", { p_campaign_ids: campaignIds })

      if (!rpcErr && rpcRows) {
        for (const r of rpcRows as Array<{ campaign_id: string; total_sent: number; opens: number; clicks: number; spam: number; bounced: number }>) {
          eventCounts.set(r.campaign_id, {
            total: Number(r.total_sent), opens: Number(r.opens), clicks: Number(r.clicks),
            spam: Number(r.spam), bounced: Number(r.bounced),
          })
        }
      }
      // Fill any missing ids with zeros (RPC missing or campaign had no sends)
      for (const id of campaignIds) {
        if (!eventCounts.has(id)) eventCounts.set(id, { total: 0, opens: 0, clicks: 0, spam: 0, bounced: 0 })
      }
    }

    // ── 4. Build response ─────────────────────────────────────────────────────
    const emails = pageItems.map(item => {
      if (item.type === "campaign") {
        const ev = eventCounts.get(item.id) ?? { total: 0, opens: 0, clicks: 0, spam: 0, bounced: 0 }
        return { id: item.id, type: "campaign" as const, subject: item.subject, sentAt: item.sentAt,
          totalSent: ev.total, totalOpened: ev.opens, totalClicked: ev.clicks,
          spamReports: ev.spam, bounced: ev.bounced }
      } else {
        return { id: item.id, type: "newsletter" as const, subject: item.subject, sentAt: item.sentAt,
          totalSent: item.sent_count, totalOpened: item.opens_count, totalClicked: item.clicks_count,
          spamReports: 0, bounced: 0 }
      }
    })

    return NextResponse.json({ emails, totalRecords, totalPages, page, pageSize })
  } catch (err) {
    console.error("[statistics/emails]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
