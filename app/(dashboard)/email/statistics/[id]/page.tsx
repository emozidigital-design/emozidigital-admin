"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"

interface Recipient {
  sentAt: string | null
  email: string
  name: string
  opened: boolean
  clicked: boolean
  spam: boolean
  bounced: boolean
}

interface LinkRow {
  url: string
  totalClicks: number
  uniqueClicks: number
}

interface DetailData {
  id: string
  type: "campaign" | "newsletter"
  subject: string
  sentAt: string | null
  summary: {
    totalSent: number
    openRate: number
    spamRate: number
    bounceRate: number
  }
  recipients: {
    data: Recipient[]
    total: number
    page: number
    totalPages: number
  } | null
  links: LinkRow[] | null
}

function CheckIcon({ ok }: { ok: boolean }) {
  if (ok) {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50">
        <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100">
      <svg className="w-2.5 h-2.5 text-zinc-300" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4" />
      </svg>
    </span>
  )
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

function pctFmt(pct: number, n: number) {
  return `${pct.toFixed(2)}% (${n})`
}

function DetailPageInner() {
  const params       = useParams()
  const searchParams = useSearchParams()
  const id   = params.id as string
  const type = searchParams.get("type") ?? "newsletter"

  const [data, setData]   = useState<DetailData | null>(null)
  const [page, setPage]   = useState(1)
  const [loading, setLoading]   = useState(true)
  const [pageLoading, setPageLoading] = useState(false)

  function fetchData(p: number, initial = false) {
    if (initial) setLoading(true); else setPageLoading(true)
    fetch(`/api/email/statistics/${id}?type=${type}&page=${p}`)
      .then(r => r.json())
      .then(d => { setData(d); setPage(p) })
      .finally(() => { setLoading(false); setPageLoading(false) })
  }

  useEffect(() => { fetchData(1, true) }, [id, type]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="w-full space-y-4">
        <div className="h-8 bg-zinc-100 rounded-lg w-48 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-zinc-100 rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-zinc-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="w-full">
        <Link href="/email/statistics" className="text-sm text-zinc-400 hover:text-zinc-600 flex items-center gap-1 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </Link>
        <p className="text-sm text-zinc-400">Email not found.</p>
      </div>
    )
  }

  const s = data.summary
  const openN   = s.totalSent > 0 ? Math.round((s.openRate   / 100) * s.totalSent) : 0
  const spamN   = s.totalSent > 0 ? Math.round((s.spamRate   / 100) * s.totalSent) : 0
  const bounceN = s.totalSent > 0 ? Math.round((s.bounceRate / 100) * s.totalSent) : 0

  const recipients = data.recipients
  const links      = data.links

  return (
    <div className="w-full">
      {/* Back + header */}
      <div className="mb-6">
        <Link href="/email/statistics" className="text-sm text-zinc-400 hover:text-zinc-600 flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Email statistics
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-zinc-900 truncate">{data.subject}</h1>
            {data.sentAt && (
              <p className="text-sm text-zinc-400 mt-0.5">
                {new Date(data.sentAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
          <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-lg border ${
            data.type === "newsletter"
              ? "bg-violet-50 text-violet-600 border-violet-200"
              : "bg-sky-50 text-sky-600 border-sky-200"
          }`}>
            {data.type === "newsletter" ? "Newsletter" : "Campaign"}
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Open rate"         value={`${s.openRate.toFixed(2)}%`}   sub={`(${openN.toLocaleString()})`}   accent="text-zinc-900" />
        <StatCard label="Spam report rate"  value={`${s.spamRate.toFixed(2)}%`}   sub={`(${spamN.toLocaleString()})`}   accent={s.spamRate > 0.1 ? "text-amber-600" : undefined} />
        <StatCard label="Click rate"        value="—"  />
        <StatCard label="Bounced rate"      value={`${s.bounceRate.toFixed(2)}%`} sub={`(${bounceN.toLocaleString()})`} accent={s.bounceRate > 0.5 ? "text-red-600" : undefined} />
      </div>

      {/* Recipients header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">
          {s.totalSent.toLocaleString()} Email{s.totalSent !== 1 ? "s" : ""}
        </h2>
        {recipients && (
          <p className="text-xs text-zinc-400">
            Page {recipients.page} of {recipients.totalPages}
          </p>
        )}
      </div>

      {/* Recipients table — campaigns only */}
      {recipients ? (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden mb-6 relative">
          {pageLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
              <div className="w-5 h-5 border-2 border-[#003434] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Header */}
          <div className="hidden sm:grid grid-cols-[1fr_160px_80px_80px_120px_80px] gap-3 px-5 py-3 border-b border-zinc-100 bg-zinc-50/80">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Sent at</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Email</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide text-center">Opened</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide text-center">Clicked</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide text-center">Reported as spam</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide text-center">Bounced</p>
          </div>

          {recipients.data.map((r, idx) => {
            const rowBg = idx % 2 === 0 ? "bg-white" : "bg-[#003434]/[0.025]"
            const date = r.sentAt
              ? new Date(r.sentAt).toLocaleString("en-IN", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
              : "—"
            return (
              <div key={idx} className={`grid grid-cols-1 sm:grid-cols-[1fr_160px_80px_80px_120px_80px] gap-1 sm:gap-3 px-5 py-3 border-b border-zinc-100 last:border-b-0 ${rowBg}`}>
                <p className="text-xs text-zinc-500 self-center">{date}</p>
                <p className="text-xs text-sky-600 self-center sm:block hidden truncate">{r.email}</p>
                <div className="self-center flex justify-center sm:block hidden"><CheckIcon ok={r.opened} /></div>
                <div className="self-center flex justify-center sm:block hidden"><CheckIcon ok={r.clicked} /></div>
                <div className="self-center flex justify-center sm:block hidden"><CheckIcon ok={r.spam} /></div>
                <div className="self-center flex justify-center sm:block hidden"><CheckIcon ok={r.bounced} /></div>
                {/* Mobile */}
                <div className="sm:hidden flex items-center gap-2 text-xs text-zinc-400">
                  <span className="text-sky-600 truncate max-w-[140px]">{r.email}</span>
                  {r.opened  && <span className="text-emerald-500">Opened</span>}
                  {r.clicked && <span className="text-sky-500">Clicked</span>}
                  {r.spam    && <span className="text-amber-500">Spam</span>}
                  {r.bounced && <span className="text-red-500">Bounced</span>}
                </div>
              </div>
            )
          })}

          {recipients.data.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-zinc-400">No recipient data.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-8 text-center mb-6">
          <p className="text-sm text-zinc-400">Per-recipient tracking is not available for newsletters.</p>
          <p className="text-xs text-zinc-300 mt-1">Opens and clicks are tracked in aggregate only.</p>
        </div>
      )}

      {/* Pagination */}
      {recipients && recipients.totalPages > 1 && (
        <div className="flex items-center justify-between mb-8">
          <p className="text-xs text-zinc-400">{recipients.total.toLocaleString()} total recipients</p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchData(page - 1)}
              disabled={page <= 1 || pageLoading}
              className="px-3 py-1.5 text-xs font-medium border border-zinc-200 rounded-lg disabled:opacity-40 hover:bg-zinc-50 transition-colors"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {[10, 25, 50].map(n => (
                <button key={n} className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${n === 10 ? "bg-[#003434] text-white border-[#003434]" : "border-zinc-200 hover:bg-zinc-50"}`}>
                  {n}
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchData(page + 1)}
              disabled={page >= recipients.totalPages || pageLoading}
              className="px-3 py-1.5 text-xs font-medium border border-zinc-200 rounded-lg disabled:opacity-40 hover:bg-zinc-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Links table */}
      {links && links.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">Links in this email</h2>
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_130px_130px] gap-3 px-5 py-3 border-b border-zinc-100 bg-zinc-50/80">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">URL</p>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide text-right">Total clicks</p>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide text-right">Unique clicks</p>
            </div>
            {links.map((l, idx) => {
              const rowBg = idx % 2 === 0 ? "bg-white" : "bg-[#003434]/[0.025]"
              const totalPct = s.totalSent > 0 ? ((l.totalClicks  / s.totalSent) * 100).toFixed(1) : "0"
              const uniqPct  = s.totalSent > 0 ? ((l.uniqueClicks / s.totalSent) * 100).toFixed(1) : "0"
              return (
                <div key={idx} className={`grid grid-cols-1 sm:grid-cols-[1fr_130px_130px] gap-1 sm:gap-3 px-5 py-3 border-b border-zinc-100 last:border-b-0 ${rowBg}`}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-600 hover:underline truncate max-w-sm">
                    {l.url}
                  </a>
                  <p className="text-sm text-zinc-700 text-right self-center sm:block hidden">{totalPct}% ({l.totalClicks})</p>
                  <p className="text-sm text-zinc-700 text-right self-center sm:block hidden">{uniqPct}% ({l.uniqueClicks})</p>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function StatisticsDetailPage() {
  return (
    <Suspense fallback={
      <div className="w-full space-y-4">
        <div className="h-8 bg-zinc-100 rounded-lg w-48 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-zinc-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    }>
      <DetailPageInner />
    </Suspense>
  )
}
