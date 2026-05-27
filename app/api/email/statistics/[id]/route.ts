import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

const LIMIT = 10

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") ?? "newsletter"
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const from = (page - 1) * LIMIT
  const to   = page * LIMIT - 1

  if (type === "campaign") {
    // ── Campaign detail ─────────────────────────────────────────────────────

    const { data: campaign, error: cErr } = await supabaseAdmin
      .from("email_campaigns")
      .select("id, subject, sent_at")
      .eq("id", params.id)
      .single()

    if (cErr || !campaign) return NextResponse.json({ error: "not found" }, { status: 404 })

    // Get send stats for summary
    const { data: allSends } = await supabaseAdmin
      .from("email_sends")
      .select("status, ses_message_id")
      .eq("campaign_id", params.id)

    const sends = allSends ?? []
    const totalSent = sends.length
    const allMessageIds = sends.map(s => s.ses_message_id).filter(Boolean) as string[]

    // All events for summary stats
    interface EventRow { ses_message_id: string; event_type: string; raw_payload: Record<string, unknown> }
    const allEvents: EventRow[] = []
    for (let i = 0; i < allMessageIds.length; i += 5000) {
      const { data } = await supabaseAdmin
        .from("email_events")
        .select("ses_message_id, event_type, raw_payload")
        .in("ses_message_id", allMessageIds.slice(i, i + 5000))
      if (data) allEvents.push(...(data as EventRow[]))
    }

    let totalOpened = 0, totalClicked = 0, totalSpam = 0, totalBounced = 0
    const openedIds = new Set<string>()
    const clickedIds = new Set<string>()

    for (const e of allEvents) {
      if (e.event_type === "open" && !openedIds.has(e.ses_message_id)) {
        openedIds.add(e.ses_message_id)
        totalOpened++
      }
      if (e.event_type === "click" && !clickedIds.has(e.ses_message_id)) {
        clickedIds.add(e.ses_message_id)
        totalClicked++
      }
      if (e.event_type === "complaint") totalSpam++
      if (e.event_type === "bounce") totalBounced++
    }

    const summary = {
      totalSent,
      openRate:   totalSent > 0 ? (totalOpened  / totalSent) * 100 : 0,
      spamRate:   totalSent > 0 ? (totalSpam    / totalSent) * 100 : 0,
      bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
    }

    // ── Paginated recipients ─────────────────────────────────────────────────
    const { data: pageSends, count } = await supabaseAdmin
      .from("email_sends")
      .select("sent_at, status, ses_message_id, email_contacts(email, name)", { count: "exact" })
      .eq("campaign_id", params.id)
      .order("sent_at", { ascending: false })
      .range(from, to)

    const pageRows = pageSends ?? []
    const pageMessageIds = pageRows.map((s: { ses_message_id: string | null }) => s.ses_message_id).filter(Boolean) as string[]

    const pageEventMap = new Map<string, { opened: boolean; clicked: boolean; spam: boolean; bounced: boolean }>()
    if (pageMessageIds.length > 0) {
      const { data: pageEvents } = await supabaseAdmin
        .from("email_events")
        .select("ses_message_id, event_type")
        .in("ses_message_id", pageMessageIds)
      for (const e of pageEvents ?? []) {
        const cur = pageEventMap.get(e.ses_message_id) ?? { opened: false, clicked: false, spam: false, bounced: false }
        if (e.event_type === "open")      cur.opened  = true
        if (e.event_type === "click")     cur.clicked = true
        if (e.event_type === "complaint") cur.spam    = true
        if (e.event_type === "bounce")    cur.bounced = true
        pageEventMap.set(e.ses_message_id, cur)
      }
    }

    const total = count ?? 0
    const recipients = {
      data: pageRows.map((s: {
        sent_at: string | null
        ses_message_id: string | null
        email_contacts: { email: string; name: string } | null
      }) => {
        const ev = s.ses_message_id ? (pageEventMap.get(s.ses_message_id) ?? { opened: false, clicked: false, spam: false, bounced: false }) : { opened: false, clicked: false, spam: false, bounced: false }
        return {
          sentAt:  s.sent_at,
          email:   s.email_contacts?.email ?? "—",
          name:    s.email_contacts?.name  ?? "",
          opened:  ev.opened,
          clicked: ev.clicked,
          spam:    ev.spam,
          bounced: ev.bounced,
        }
      }),
      total,
      page,
      totalPages: Math.ceil(total / LIMIT),
    }

    // ── Links table (click events with URL) ──────────────────────────────────
    const clickEvents = allEvents.filter(e => e.event_type === "click")
    const linkTotals  = new Map<string, { total: number; uniqueIds: Set<string> }>()

    for (const e of clickEvents) {
      let url: string | null = null
      try {
        const p = e.raw_payload as Record<string, unknown>
        const click = p?.click as Record<string, unknown> | undefined
        url = (click?.link ?? p?.link ?? p?.linkUrl ?? p?.url) as string | null
      } catch { /* skip unparseable */ }
      if (!url) continue
      const cur = linkTotals.get(url) ?? { total: 0, uniqueIds: new Set<string>() }
      cur.total++
      cur.uniqueIds.add(e.ses_message_id)
      linkTotals.set(url, cur)
    }

    const links = Array.from(linkTotals.entries())
      .map(([url, v]) => ({ url, totalClicks: v.total, uniqueClicks: v.uniqueIds.size }))
      .sort((a, b) => b.totalClicks - a.totalClicks)

    return NextResponse.json({
      id: campaign.id,
      type: "campaign",
      subject: campaign.subject,
      sentAt: campaign.sent_at,
      summary,
      recipients,
      links: links.length > 0 ? links : null,
    })
  }

  // ── Newsletter detail ──────────────────────────────────────────────────────
  const { data: nl, error: nErr } = await supabaseAdmin
    .from("newsletter_sends")
    .select("id, subject, sent_at, sent_count, opens_count, clicks_count, failed_count")
    .eq("id", params.id)
    .single()

  if (nErr || !nl) return NextResponse.json({ error: "not found" }, { status: 404 })

  const totalSent = nl.sent_count ?? 0
  const summary = {
    totalSent,
    openRate:   totalSent > 0 ? ((nl.opens_count  ?? 0) / totalSent) * 100 : 0,
    spamRate:   0,
    bounceRate: 0,
  }

  return NextResponse.json({
    id: nl.id,
    type: "newsletter",
    subject: nl.subject,
    sentAt: nl.sent_at,
    summary,
    recipients: null,
    links: null,
  })
}
