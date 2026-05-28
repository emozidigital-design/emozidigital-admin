import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export const maxDuration = 30

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

    const [campaignResult, sendsResult] = await Promise.all([
      supabaseAdmin
        .from("email_campaigns")
        .select("id, subject, sent_at, sent_count, opens_count, clicks_count, bounced_count, spam_count")
        .eq("id", params.id)
        .single(),
      supabaseAdmin
        .from("email_sends")
        .select("sent_at, status, ses_message_id, email_contacts(email, name)")
        .eq("campaign_id", params.id)
        .order("sent_at", { ascending: false })
        .range(from, to),
    ])

    const campaign = campaignResult.data
    if (campaignResult.error || !campaign) return NextResponse.json({ error: "not found" }, { status: 404 })

    interface EventRow { ses_message_id: string; event_type: string; raw_payload: Record<string, unknown> }

    const totalSent    = campaign.sent_count    ?? 0
    const totalOpened  = campaign.opens_count   ?? 0
    const totalBounced = campaign.bounced_count ?? 0
    const totalSpam    = campaign.spam_count    ?? 0

    const summary = {
      totalSent,
      openRate:   totalSent > 0 ? (totalOpened  / totalSent) * 100 : 0,
      spamRate:   totalSent > 0 ? (totalSpam    / totalSent) * 100 : 0,
      bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
    }

    // ── Paginated recipients ─────────────────────────────────────────────────
    const pageRows       = sendsResult.data ?? []
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

    const total = totalSent
    const recipients = {
      data: pageRows.map((s) => {
        const ev = s.ses_message_id ? (pageEventMap.get(s.ses_message_id) ?? { opened: false, clicked: false, spam: false, bounced: false }) : { opened: false, clicked: false, spam: false, bounced: false }
        const contact = Array.isArray(s.email_contacts) ? s.email_contacts[0] : s.email_contacts
        return {
          sentAt:  s.sent_at,
          email:   contact?.email ?? "—",
          name:    contact?.name  ?? "",
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

    // ── Links table (page 1 only — skip on pagination) ───────────────────────
    const linkTotals = new Map<string, { total: number; uniqueIds: Set<string> }>()

    if (page === 1 && (campaign.clicks_count ?? 0) > 0) {
      // Single join query — avoids fetching 100k message IDs into JS then batching
      const { data: clickEventRows } = await supabaseAdmin
        .from("email_events")
        .select("ses_message_id, raw_payload, email_sends!inner(campaign_id)")
        .eq("email_sends.campaign_id", params.id)
        .eq("event_type", "click")

      for (const e of (clickEventRows ?? []) as unknown as EventRow[]) {
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
