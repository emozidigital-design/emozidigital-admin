"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useClient } from "../client-context"

type EmailType = "newsletter" | "campaign"
type StatusFilter = "all" | "sent" | "sending" | "failed" | "scheduled" | "draft" | "test"
type TypeFilter = "all" | "newsletter" | "campaign"

interface UnifiedEmail {
  id: string
  type: EmailType
  subject: string
  tagIds: string[]
  tagNames: string[]
  sent: number | null
  openCount: number | null
  openPct: number | null
  clickCount: number | null
  clickPct: number | null
  status: string
  sentAt: string | null
  scheduledAt: string | null
  createdAt: string
}

interface RawCampaign {
  id: string
  subject: string
  status: string
  sent_at: string | null
  scheduled_at: string | null
  created_at: string
  tag_ids: string[]
}

interface RawNewsletter {
  id: string
  subject: string
  status: string
  sent_at: string | null
  scheduled_at: string | null
  created_at: string
  tag_ids: string[]
  sent_count: number
  opens_count: number
  clicks_count: number
}

interface Tag { id: string; name: string }

const STATUS_CONFIG: Record<string, { badge: string; dot: string; label: string }> = {
  sending:   { badge: "bg-amber-50 text-amber-700 border-amber-200",        dot: "bg-amber-400",   label: "Sending"   },
  sent:      { badge: "bg-emerald-50 text-emerald-700 border-emerald-200",  dot: "bg-emerald-500", label: "Sent"      },
  failed:    { badge: "bg-red-50 text-red-700 border-red-200",              dot: "bg-red-500",     label: "Failed"    },
  scheduled: { badge: "bg-blue-50 text-blue-700 border-blue-200",           dot: "bg-blue-400",    label: "Scheduled" },
  draft:     { badge: "bg-zinc-100 text-zinc-500 border-zinc-200",          dot: "bg-zinc-300",    label: "Draft"     },
  test:      { badge: "bg-purple-50 text-purple-700 border-purple-200",     dot: "bg-purple-400",  label: "Test"      },
}

function pctFmt(n: number | null, sent: number | null) {
  if (n === null || sent === null) return "—"
  if (sent === 0) return "0% (0)"
  return `${((n / sent) * 100).toFixed(1)}% (${n})`
}

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sent", label: "Sent" },
  { key: "sending", label: "Sending" },
  { key: "scheduled", label: "Scheduled" },
  { key: "draft", label: "Draft" },
  { key: "failed", label: "Failed" },
]

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "newsletter", label: "Newsletter" },
  { key: "campaign", label: "Campaign" },
]

export default function NewslettersPage() {
  const { clientId } = useClient()
  const router = useRouter()

  const [items, setItems]           = useState<UnifiedEmail[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [typeFilter, setTypeFilter]     = useState<TypeFilter>("all")
  const [createOpen, setCreateOpen]     = useState(false)
  const createRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (createRef.current && !createRef.current.contains(e.target as Node)) setCreateOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (clientId) p.set("client_id", clientId)

    Promise.all([
      fetch(`/api/email/campaigns?${p}`).then(r => r.json()),
      fetch(`/api/email/newsletter?${p}`).then(r => r.json()),
      clientId
        ? fetch(`/api/email/tags?${p}`).then(r => r.json())
        : Promise.resolve([]),
      // Fetch aggregated stats (sends + events) for campaigns so we get real counts
      fetch(`/api/email/statistics?${p}`).then(r => r.ok ? r.json() : Promise.resolve(null)).catch(() => null),
    ])
      .then(([campaigns, newsletters, tags, statsData]) => {
        const tagMap = new Map<string, string>(
          (Array.isArray(tags) ? tags : []).map((t: Tag) => [t.id, t.name])
        )

        // Build a lookup map from the statistics API: campaign id → { totalSent, totalOpened, totalClicked }
        interface StatRow { id: string; type: string; totalSent: number; totalOpened: number; totalClicked: number }
        const statsMap = new Map<string, StatRow>()
        for (const row of (statsData?.emails ?? []) as StatRow[]) {
          statsMap.set(row.id, row)
        }

        const unified: UnifiedEmail[] = []

        // Campaigns — populate send/open/click counts from statistics API
        for (const c of (Array.isArray(campaigns) ? campaigns : []) as RawCampaign[]) {
          const tagNames = (c.tag_ids ?? []).map((id: string) => tagMap.get(id) ?? id)
          const stat       = statsMap.get(c.id)
          const sent       = stat?.totalSent    ?? null
          const openCount  = stat?.totalOpened  ?? null
          const clickCount = stat?.totalClicked ?? null
          const openPct    = sent && sent > 0 && openCount  !== null ? (openCount  / sent) * 100 : null
          const clickPct   = sent && sent > 0 && clickCount !== null ? (clickCount / sent) * 100 : null
          unified.push({
            id: c.id, type: "campaign",
            subject: c.subject,
            tagIds: c.tag_ids ?? [],
            tagNames,
            sent,
            openCount,
            openPct,
            clickCount,
            clickPct,
            status: c.status,
            sentAt: c.sent_at,
            scheduledAt: c.scheduled_at,
            createdAt: c.created_at,
          })
        }

        // Newsletters — use stored counts directly
        for (const n of (Array.isArray(newsletters) ? newsletters : []) as RawNewsletter[]) {
          const tagNames = (n.tag_ids ?? []).map((id: string) => tagMap.get(id) ?? id)
          const openPct  = n.sent_count > 0 ? (n.opens_count  / n.sent_count) * 100 : 0
          const clickPct = n.sent_count > 0 ? (n.clicks_count / n.sent_count) * 100 : 0
          unified.push({
            id: n.id, type: "newsletter",
            subject: n.subject,
            tagIds: n.tag_ids ?? [],
            tagNames,
            sent: n.sent_count,
            openCount: n.opens_count,
            openPct,
            clickCount: n.clicks_count,
            clickPct,
            status: n.status,
            sentAt: n.sent_at,
            scheduledAt: n.scheduled_at,
            createdAt: n.created_at,
          })
        }

        // Sort by createdAt desc
        unified.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        setItems(unified)
      })
      .finally(() => setLoading(false))
  }, [clientId])

  const filtered = items.filter(item => {
    const matchSearch = search.trim() === "" || item.subject.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || item.status === statusFilter
    const matchType   = typeFilter === "all" || item.type === typeFilter
    return matchSearch && matchStatus && matchType
  })

  function formatStatus(item: UnifiedEmail) {
    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.draft
    let dateStr = ""
    if (item.status === "sent" && item.sentAt) {
      dateStr = new Date(item.sentAt).toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    } else if (item.status === "scheduled" && item.scheduledAt) {
      dateStr = new Date(item.scheduledAt).toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    }
    return { cfg, dateStr }
  }

  const sentCount = items.filter(i => i.status === "sent").length

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/email" className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Newsletter / Campaign</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{items.length} total · {sentCount} sent</p>
          </div>
        </div>

        {/* Create dropdown */}
        <div className="relative" ref={createRef}>
          <button
            onClick={() => setCreateOpen(o => !o)}
            className="flex items-center gap-2 bg-[#003434] text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-[#003434]/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {createOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden z-20">
              <button
                onClick={() => { setCreateOpen(false); router.push("/email/newsletter") }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <span className="w-5 h-5 rounded bg-violet-50 flex items-center justify-center text-[10px] font-bold text-violet-600">NL</span>
                New Newsletter
              </button>
              <div className="border-t border-zinc-100" />
              <button
                onClick={() => { setCreateOpen(false); router.push("/email/campaigns") }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <span className="w-5 h-5 rounded bg-sky-50 flex items-center justify-center text-[10px] font-bold text-sky-600">C</span>
                New Campaign
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by subject…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-zinc-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
          />
        </div>
        {/* Type filter */}
        <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${typeFilter === f.key ? "bg-[#003434] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {/* Status filter */}
        <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === f.key ? "bg-[#003434] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-zinc-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl py-16 text-center">
          <svg className="w-10 h-10 text-zinc-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-zinc-400 font-medium">
            {items.length === 0 ? "No newsletters or campaigns yet." : "No results match your filters."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[1fr_180px_90px_130px_100px_170px] gap-3 px-5 py-3 border-b border-zinc-100 bg-zinc-50/80">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Newsletter subject</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Selected tags</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide text-right">Emails sent</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide text-right">Opens</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide text-right">Clicks</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Status</p>
          </div>

          {filtered.map((item, idx) => {
            const { cfg, dateStr } = formatStatus(item)
            const rowBg = idx % 2 === 0 ? "bg-white" : "bg-[#003434]/[0.025]"
            const editHref = item.type === "newsletter" ? "/email/newsletter" : "/email/campaigns"

            return (
              <div
                key={item.id}
                className={`grid grid-cols-1 sm:grid-cols-[1fr_180px_90px_130px_100px_170px] gap-1 sm:gap-3 px-5 py-3.5 border-b border-zinc-100 last:border-b-0 hover:bg-[#003434]/[0.04] transition-colors ${rowBg}`}
              >
                {/* Subject */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    item.type === "newsletter"
                      ? "bg-violet-50 text-violet-600 border-violet-200"
                      : "bg-sky-50 text-sky-600 border-sky-200"
                  }`}>
                    {item.type === "newsletter" ? "NL" : "C"}
                  </span>
                  <Link href={editHref} className="text-sm font-medium text-zinc-800 hover:text-[#003434] hover:underline truncate transition-colors">
                    {item.subject}
                  </Link>
                </div>

                {/* Tags */}
                <div className="self-center sm:block hidden">
                  {item.tagNames.length > 0 ? (
                    <p className="text-xs text-zinc-500 truncate" title={item.tagNames.join(", ")}>
                      {item.tagNames.join(", ")}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-300">—</p>
                  )}
                </div>

                {/* Sent */}
                <p className="text-sm font-semibold text-emerald-600 text-right self-center sm:block hidden">
                  {item.sent !== null ? item.sent.toLocaleString() : "—"}
                </p>

                {/* Opens */}
                <div className="text-right self-center sm:block hidden">
                  {item.openCount !== null && item.sent !== null ? (
                    <>
                      <p className="text-sm font-semibold text-zinc-700">{((item.openPct ?? 0)).toFixed(1)}%</p>
                      <p className="text-[10px] text-zinc-400">({item.openCount})</p>
                    </>
                  ) : (
                    <p className="text-sm text-zinc-300">—</p>
                  )}
                </div>

                {/* Clicks */}
                <div className="text-right self-center sm:block hidden">
                  {item.clickCount !== null && item.sent !== null ? (
                    <>
                      <p className="text-sm font-semibold text-zinc-700">{((item.clickPct ?? 0)).toFixed(1)}%</p>
                      <p className="text-[10px] text-zinc-400">({item.clickCount})</p>
                    </>
                  ) : (
                    <p className="text-sm text-zinc-300">—</p>
                  )}
                </div>

                {/* Status */}
                <div className="self-center sm:flex hidden items-center gap-2">
                  {item.status === "sent" && (
                    <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    {dateStr && <p className="text-[10px] text-zinc-400 mt-0.5">{dateStr}</p>}
                  </div>
                </div>

                {/* Mobile secondary */}
                <div className="sm:hidden flex items-center gap-2 text-xs text-zinc-400">
                  {item.tagNames.length > 0 && <span className="truncate max-w-[120px]">{item.tagNames[0]}{item.tagNames.length > 1 ? ` +${item.tagNames.length - 1}` : ""}</span>}
                  {item.sent !== null && <><span>·</span><span className="text-emerald-600 font-medium">{item.sent} sent</span></>}
                  <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.badge}`}>{cfg.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-zinc-400 mt-3 text-right">
          Showing {filtered.length} of {items.length} record{items.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  )
}
