"use client"

import { useState, useEffect } from "react"
import { useClient } from "../client-context"

interface NewsletterSend {
  id: string
  subject: string
  recipient_type: string
  status: string
  sent_count: number
  failed_count: number
  opens_count: number
  clicks_count: number
  sent_at: string | null
  created_at: string
  blog_post_id: string
}

type StatusFilter = "all" | "sent" | "sending" | "failed" | "test"

const STATUS_CONFIG: Record<string, { badge: string; dot: string; label: string }> = {
  sending:   { badge: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-400",   label: "Sending"   },
  sent:      { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Sent"  },
  failed:    { badge: "bg-red-50 text-red-700 border-red-200",         dot: "bg-red-500",     label: "Failed"    },
  scheduled: { badge: "bg-blue-50 text-blue-700 border-blue-200",      dot: "bg-blue-400",    label: "Scheduled" },
  draft:     { badge: "bg-zinc-100 text-zinc-500 border-zinc-200",     dot: "bg-zinc-300",    label: "Draft"     },
  test:      { badge: "bg-purple-50 text-purple-700 border-purple-200",dot: "bg-purple-400",  label: "Test"      },
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl px-5 py-4 flex flex-col gap-1">
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${accent ?? "text-zinc-900"}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-400">{sub}</p>}
    </div>
  )
}

export default function NewsletterLogsPage() {
  const { clientId } = useClient()

  const [history, setHistory] = useState<NewsletterSend[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (clientId) params.set("client_id", clientId)
    fetch(`/api/email/newsletter?${params}`)
      .then(r => r.json())
      .then(d => setHistory(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [clientId])

  const filtered = history.filter(h => {
    const matchSearch = search.trim() === "" || h.subject.toLowerCase().includes(search.toLowerCase())
    let matchStatus: boolean
    if (statusFilter === "all") {
      matchStatus = true
    } else if (statusFilter === "failed") {
      // "Failed" tab shows any send with failures — batch-level OR partial
      matchStatus = h.status === "failed" || h.failed_count > 0
    } else {
      matchStatus = h.status === statusFilter
    }
    return matchStatus && matchSearch
  })

  const totalSent     = history.reduce((a, h) => a + (h.sent_count ?? 0), 0)
  const totalOpens    = history.reduce((a, h) => a + (h.opens_count ?? 0), 0)
  const totalFailed   = history.reduce((a, h) => a + (h.failed_count ?? 0), 0)
  const successCount  = history.filter(h => h.status === "sent").length
  const openRate      = totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0

  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: "all",     label: "All" },
    { key: "sent",    label: "Sent" },
    { key: "sending", label: "Sending" },
    { key: "failed",  label: "Failed" },
    { key: "test",    label: "Test" },
  ]

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Logs</h1>
        <p className="text-sm text-zinc-500 mt-1">History of all newsletter sendings</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total sends"      value={history.length} />
        <StatCard label="Emails delivered" value={totalSent.toLocaleString()} />
        <StatCard label="Unique opens"     value={totalOpens.toLocaleString()} sub={`${openRate}% open rate`} accent="text-emerald-600" />
        <StatCard label="Failed"           value={totalFailed.toLocaleString()} sub={`${successCount} successful batch${successCount !== 1 ? "es" : ""}`} accent={totalFailed > 0 ? "text-red-600" : undefined} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
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
        <div className="flex gap-1.5 p-1 bg-zinc-100 rounded-xl">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === f.key
                  ? "bg-[#003434] text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-zinc-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl py-16 text-center">
          <svg className="w-10 h-10 text-zinc-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-zinc-400 font-medium">
            {history.length === 0 ? "No newsletters sent yet." : "No results match your filters."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_110px_70px_70px_70px_140px_80px] gap-3 px-5 py-3 border-b border-zinc-100 bg-zinc-50/80">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Subject</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Recipients</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide text-right">Sent</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide text-right">Opens</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide text-right">Failed</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Date</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide text-right">Status</p>
          </div>

          {/* Rows */}
          {filtered.map((h, idx) => {
            const cfg = STATUS_CONFIG[h.status] ?? STATUS_CONFIG.sending
            const date = (h.sent_at ?? h.created_at)
              ? new Date(h.sent_at ?? h.created_at).toLocaleString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })
              : "—"
            const openPct = h.sent_count > 0 ? Math.round((h.opens_count / h.sent_count) * 100) : 0
            const rowBg = idx % 2 === 0 ? "bg-white" : "bg-[#003434]/[0.025]"

            return (
              <div
                key={h.id}
                className={`grid grid-cols-1 sm:grid-cols-[1fr_110px_70px_70px_70px_140px_80px] gap-1 sm:gap-3 px-5 py-3.5 border-b border-zinc-100 last:border-b-0 hover:bg-[#003434]/[0.04] transition-colors ${rowBg}`}
              >
                {/* Subject */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                  <p className="text-sm font-medium text-zinc-800 truncate">{h.subject}</p>
                </div>

                {/* Recipient type */}
                <p className="text-xs text-zinc-500 capitalize self-center sm:block hidden">{h.recipient_type}</p>

                {/* Sent */}
                <p className="text-sm font-semibold text-emerald-600 text-right self-center sm:block hidden">
                  {h.sent_count > 0 ? h.sent_count.toLocaleString() : "—"}
                </p>

                {/* Opens */}
                <div className="text-right self-center sm:block hidden">
                  {h.opens_count > 0 ? (
                    <p className="text-sm font-semibold text-[#003434]">{h.opens_count}</p>
                  ) : (
                    <p className="text-xs text-zinc-300">—</p>
                  )}
                  {h.opens_count > 0 && <p className="text-[10px] text-zinc-400">{openPct}%</p>}
                </div>

                {/* Failed */}
                <p className={`text-sm font-semibold text-right self-center sm:block hidden ${h.failed_count > 0 ? "text-red-500" : "text-zinc-200"}`}>
                  {h.failed_count > 0 ? h.failed_count.toLocaleString() : "—"}
                </p>

                {/* Date */}
                <p className="text-xs text-zinc-400 self-center sm:block hidden">{date}</p>

                {/* Status badge */}
                <div className="self-center sm:flex hidden justify-end">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>

                {/* Mobile secondary row */}
                <div className="sm:hidden flex items-center gap-3 text-xs text-zinc-400 pl-5">
                  <span className="capitalize">{h.recipient_type}</span>
                  <span>·</span>
                  <span className="text-emerald-600 font-medium">{h.sent_count} sent</span>
                  {h.opens_count > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-[#003434] font-medium">{h.opens_count} opens</span>
                    </>
                  )}
                  {h.failed_count > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-red-500 font-medium">{h.failed_count} failed</span>
                    </>
                  )}
                  <span className={`ml-auto text-xs font-medium px-2.5 py-0.5 rounded-full border ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-zinc-400 mt-3 text-right">
          Showing {filtered.length} of {history.length} record{history.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  )
}
