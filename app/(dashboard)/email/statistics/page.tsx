"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useClient } from "../client-context"
import BarChart from "@/components/charts/BarChart"

interface DayPoint {
  date: string
  sent: number
  openPct: number
  spamPct: number
  bouncePct: number
}

interface EmailRow {
  id: string
  type: "campaign" | "newsletter"
  subject: string
  sentAt: string | null
  totalSent: number
  totalOpened: number
  totalClicked: number
  spamReports: number
  bounced: number
}

interface StatsData {
  summary: {
    totalSent: number
    avgOpenRate: number
    avgSpamRate: number
    avgBounceRate: number
  }
  dailySeries: DayPoint[]
  emails: EmailRow[]
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

const MONTH_ABBR_CARD = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
function fmtDateRange(iso: string) {
  const p = iso.split("-")
  if (p.length < 3) return iso
  const m = parseInt(p[1], 10) - 1
  const d = parseInt(p[2], 10)
  return `${MONTH_ABBR_CARD[m] ?? p[1]} ${d}, ${p[0]}`
}

function ChartCard({ title, data, color, formatValue, metricKey }: {
  title: string
  data: DayPoint[]
  color: string
  formatValue?: (v: number) => string
  metricKey: "sent" | "openPct" | "spamPct" | "bouncePct"
}) {
  const chartData = data.map(d => ({
    label: d.date,
    value: Math.round((d[metricKey] as number) * 100) / 100,
  }))

  const total = metricKey === "sent"
    ? data.reduce((s, d) => s + d.sent, 0)
    : null

  const avg = metricKey !== "sent" && data.length > 0
    ? data.reduce((s, d) => s + (d[metricKey] as number), 0) / data.length
    : null

  const displayStat = metricKey === "sent"
    ? total?.toLocaleString()
    : avg != null ? (formatValue ? formatValue(avg) : `${avg.toFixed(2)}%`) : null

  const dateRange = data.length > 1
    ? `${fmtDateRange(data[0].date)} – ${fmtDateRange(data[data.length - 1].date)}`
    : data.length === 1 ? fmtDateRange(data[0].date) : ""

  return (
    <div className="bg-white border border-zinc-200 rounded-xl px-5 py-4">
      <div className="flex items-start justify-between mb-1">
        <p className="text-sm font-semibold text-zinc-700">
          {title}
          {displayStat && (
            <span style={{ color }} className="ml-1.5 font-bold">
              {displayStat}
            </span>
          )}
        </p>
        {dateRange && (
          <p className="text-[10px] text-zinc-400 font-mono shrink-0 ml-3 mt-0.5">{dateRange}</p>
        )}
      </div>
      <BarChart data={chartData} color={color} height={220} formatValue={formatValue} />
    </div>
  )
}

function pctFmt(n: number, total: number) {
  if (total === 0) return "0% (0)"
  return `${((n / total) * 100).toFixed(2)}% (${n})`
}

const STATUS_CONFIG: Record<string, { badge: string; label: string }> = {
  sending:   { badge: "bg-amber-50 text-amber-700 border-amber-200",        label: "Sending"   },
  sent:      { badge: "bg-emerald-50 text-emerald-700 border-emerald-200",  label: "Sent"      },
  failed:    { badge: "bg-red-50 text-red-700 border-red-200",              label: "Failed"    },
  scheduled: { badge: "bg-blue-50 text-blue-700 border-blue-200",           label: "Scheduled" },
  draft:     { badge: "bg-zinc-100 text-zinc-500 border-zinc-200",          label: "Draft"     },
  test:      { badge: "bg-purple-50 text-purple-700 border-purple-200",     label: "Test"      },
}

// ── Date range picker ────────────────────────────────────────────────────────
function DateRangePicker({ from, to, onChange }: {
  from: string; to: string
  onChange: (from: string, to: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ from, to })
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function apply() {
    onChange(draft.from, draft.to)
    setOpen(false)
  }
  function clear() {
    setDraft({ from: "", to: "" })
    onChange("", "")
    setOpen(false)
  }

  const hasFilter = from || to
  const MONTH_A = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  function fmt(iso: string) {
    if (!iso) return ""
    const p = iso.split("-")
    return `${MONTH_A[parseInt(p[1],10)-1]} ${parseInt(p[2],10)}, ${p[0]}`
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => { setDraft({ from, to }); setOpen(v => !v) }}
        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
          hasFilter
            ? "bg-[#003434] text-white border-[#003434]"
            : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {hasFilter
          ? `${fmt(from) || "…"} – ${fmt(to) || "…"}`
          : "Filter by date"}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-xl p-4 z-50"
          style={{ minWidth: 280 }}
        >
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Date range</p>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-zinc-400 font-medium">From</span>
              <input
                type="date"
                value={draft.from}
                max={draft.to || undefined}
                onChange={e => setDraft(v => ({ ...v, from: e.target.value }))}
                className="text-sm border border-zinc-200 rounded-lg px-3 py-1.5 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#003434]/20 focus:border-[#003434]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-zinc-400 font-medium">To</span>
              <input
                type="date"
                value={draft.to}
                min={draft.from || undefined}
                onChange={e => setDraft(v => ({ ...v, to: e.target.value }))}
                className="text-sm border border-zinc-200 rounded-lg px-3 py-1.5 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#003434]/20 focus:border-[#003434]"
              />
            </label>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={apply}
              disabled={!draft.from && !draft.to}
              className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-[#003434] text-white hover:bg-[#004848] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Apply
            </button>
            {hasFilter && (
              <button
                onClick={clear}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function StatisticsPage() {
  const { clientId } = useClient()
  const [data, setData]       = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo]     = useState("")

  function loadData(from: string, to: string) {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (clientId) params.set("client_id", clientId)
    if (from)     params.set("from", from)
    if (to)       params.set("to", to)
    fetch(`/api/email/statistics?${params}`)
      .then(r => {
        if (!r.ok) throw new Error(`API error ${r.status}`)
        return r.json()
      })
      .then(d => {
        if (d?.error) throw new Error(d.error)
        setData(d)
      })
      .catch(e => setError(e.message ?? "Failed to load statistics"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData(dateFrom, dateTo) }, [clientId])

  function handleDateChange(from: string, to: string) {
    setDateFrom(from)
    setDateTo(to)
    loadData(from, to)
  }

  const summary = data?.summary
  const series  = data?.dailySeries ?? []
  const emails  = data?.emails ?? []

  if (error) {
    return (
      <div className="w-full">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/email" className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900">Email statistics</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-6 text-center">
          <p className="text-sm font-medium text-red-700 mb-1">Failed to load statistics</p>
          <p className="text-xs text-red-400">{error}</p>
          <button
            onClick={() => loadData(dateFrom, dateTo)}
            className="mt-4 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/email" className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Email statistics</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {dateFrom || dateTo
                ? `Filtered: ${dateFrom || "…"} – ${dateTo || "…"}`
                : "Opens, clicks, bounces & send trends — all time"}
            </p>
          </div>
        </div>
        <DateRangePicker from={dateFrom} to={dateTo} onChange={handleDateChange} />
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-zinc-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Number of emails sent" value={(summary?.totalSent ?? 0).toLocaleString()} />
          <StatCard
            label="Average % opened"
            value={`${(summary?.avgOpenRate ?? 0).toFixed(1)}%`}
            accent="text-sky-600"
          />
          <StatCard
            label="Average % spam"
            value={`${(summary?.avgSpamRate ?? 0).toFixed(2)}%`}
            accent={(summary?.avgSpamRate ?? 0) > 0.1 ? "text-amber-600" : undefined}
          />
          <StatCard
            label="Average % bounced"
            value={`${(summary?.avgBounceRate ?? 0).toFixed(2)}%`}
            accent={(summary?.avgBounceRate ?? 0) > 0.5 ? "text-red-600" : undefined}
          />
        </div>
      )}

      {/* Bar charts 2×2 */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-zinc-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <ChartCard title="Number of emails sent" data={series} color="#1d7a6e" metricKey="sent" />
          <ChartCard title="Average percentage of opened emails" data={series} color="#3b9eda" metricKey="openPct" formatValue={v => `${v.toFixed(1)}%`} />
          <ChartCard title="Average percentage of spam reports per opened email" data={series} color="#3b9eda" metricKey="spamPct" formatValue={v => `${v.toFixed(2)}%`} />
          <ChartCard title="Average percentage of bounced emails" data={series} color="#3b9eda" metricKey="bouncePct" formatValue={v => `${v.toFixed(2)}%`} />
        </div>
      )}

      {/* Emails table */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">Emails</h2>
        {!loading && <p className="text-xs text-zinc-400">{emails.length} record{emails.length !== 1 ? "s" : ""}</p>}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-zinc-100 rounded-xl animate-pulse" />)}
        </div>
      ) : emails.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl py-16 text-center">
          <svg className="w-10 h-10 text-zinc-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm text-zinc-400 font-medium">No sent emails yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_110px_120px_120px_120px] gap-3 px-5 py-3 border-b border-zinc-100 bg-zinc-50/80">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Email subject</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide text-right">Total sent</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide text-right">Total opened</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide text-right">Spam reports</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide text-right">Bounced</p>
          </div>

          {emails.map((row, idx) => {
            const openRate = row.totalSent > 0 ? row.totalOpened / row.totalSent : 0
            const lowOpen  = openRate < 0.2 && row.totalSent > 0
            const rowBg    = idx % 2 === 0 ? "bg-white" : "bg-[#003434]/[0.025]"

            return (
              <div
                key={row.id}
                className={`grid grid-cols-1 sm:grid-cols-[1fr_110px_120px_120px_120px] gap-1 sm:gap-3 px-5 py-3.5 border-b border-zinc-100 last:border-b-0 hover:bg-[#003434]/[0.04] transition-colors ${rowBg}`}
              >
                {/* Subject */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                    row.type === "newsletter"
                      ? "bg-violet-50 text-violet-600 border-violet-200"
                      : "bg-sky-50 text-sky-600 border-sky-200"
                  }`}>
                    {row.type === "newsletter" ? "NL" : "C"}
                  </span>
                  <Link
                    href={`/email/statistics/${row.id}?type=${row.type}`}
                    className={`text-sm font-medium truncate hover:underline ${lowOpen ? "text-amber-600" : "text-zinc-800"}`}
                  >
                    {row.subject}
                  </Link>
                </div>

                {/* Total sent */}
                <p className="text-sm font-semibold text-zinc-700 text-right self-center sm:block hidden">
                  {row.totalSent.toLocaleString()}
                </p>

                {/* Total opened */}
                <p className={`text-sm font-semibold text-right self-center sm:block hidden ${lowOpen ? "text-amber-600" : "text-zinc-700"}`}>
                  {pctFmt(row.totalOpened, row.totalSent)}
                </p>

                {/* Spam */}
                <p className={`text-sm font-semibold text-right self-center sm:block hidden ${row.spamReports > 0 ? "text-amber-600" : "text-zinc-300"}`}>
                  {pctFmt(row.spamReports, row.totalSent)}
                </p>

                {/* Bounced */}
                <p className={`text-sm font-semibold text-right self-center sm:block hidden ${row.bounced > 0 ? "text-red-500" : "text-zinc-300"}`}>
                  {pctFmt(row.bounced, row.totalSent)}
                </p>

                {/* Mobile row */}
                <div className="sm:hidden flex items-center gap-2 text-xs text-zinc-400 pl-0">
                  <span className="text-emerald-600 font-medium">{row.totalSent} sent</span>
                  <span>·</span>
                  <span className={lowOpen ? "text-amber-600 font-medium" : "font-medium"}>
                    {pctFmt(row.totalOpened, row.totalSent)} opened
                  </span>
                  {row.bounced > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-red-500 font-medium">{row.bounced} bounced</span>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
