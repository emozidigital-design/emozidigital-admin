"use client"

import useSWR from "swr"
import Link from "next/link"

const fetcher = async (url: string) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error("API request failed")
  return r.json()
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return "—"
    const diff = Date.now() - d.getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return "just now"
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  } catch {
    return "—"
  }
}

const COLUMNS = ["Pending", "In Progress", "Submitted", "Completed", "Blocked"] as const

const COL_STYLE: Record<string, { dot: string; label: string; border: string; card: string }> = {
  Pending:      { dot: "bg-zinc-400",   label: "text-zinc-500",   border: "border-zinc-200",        card: "hover:border-zinc-400" },
  "In Progress":{ dot: "bg-[#70BF4B]", label: "text-[#70BF4B]",  border: "border-zinc-200",       card: "hover:border-[#70BF4B]/60" },
  Submitted:    { dot: "bg-sky-500",    label: "text-sky-600",    border: "border-zinc-200",          card: "hover:border-sky-500/60" },
  Completed:    { dot: "bg-[#70BF4B]",  label: "text-[#70BF4B]",  border: "border-zinc-200",        card: "hover:border-[#70BF4B]/60" },
  Blocked:      { dot: "bg-red-500",    label: "text-red-600",    border: "border-zinc-200",          card: "hover:border-red-500/60" },
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-zinc-100 ${className}`} />
}

// ─── Stats ──────────────────────────────────────────────────────────────────

function StatsGrid() {
  const { data, isLoading, error } = useSWR("/api/dashboard/stats", fetcher, { 
    refreshInterval: 30000,
    shouldRetryOnError: true 
  })

  const loading = isLoading && !data && !error

  const stats = [
    {
      label: "Total Clients",
      value: loading ? null : (data?.totalClients ?? 0),
      sub: "all time",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: "Active Onboardings",
      value: loading ? null : (data?.activeOnboardings ?? 0),
      sub: "in progress",
      accent: true,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      label: "Monthly Revenue",
      value: loading ? null : (data?.monthlyRevenue > 0 ? `₹${(data.monthlyRevenue / 1000).toFixed(1)}k` : "—"),
      sub: "active clients",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Pending Payments",
      value: loading ? null : (data?.pendingPayments ?? 0),
      sub: "require action",
      alert: !loading && (data?.pendingPayments ?? 0) > 0,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`relative overflow-hidden bg-white border rounded-xl p-5 transition-all group shadow-sm
            ${s.alert ? "border-red-200" : s.accent ? "border-[#70BF4B]/30" : "border-zinc-200 hover:border-zinc-300"}`}
        >
          <div className="flex items-start justify-between mb-4">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{s.label}</span>
            <span className={`${s.alert ? "text-red-400" : s.accent ? "text-[#70BF4B]" : "text-zinc-600"}`}>
              {s.icon}
            </span>
          </div>
          {s.value === null ? (
            <Skeleton className="h-8 w-16 mb-2" />
          ) : (
            <div className={`text-3xl font-bold font-mono tracking-tight mb-1 ${s.alert ? "text-red-500" : "text-[#003434]"}`}>
              {s.value}
            </div>
          )}
          <div className="text-[11px] text-zinc-600">{s.sub}</div>
          {/* subtle corner accent */}
          <div className={`absolute bottom-0 right-0 w-12 h-12 rounded-tl-2xl opacity-5 ${s.accent ? "bg-[#70BF4B]" : s.alert ? "bg-red-400" : "bg-[#D0F255]"}`} />
        </div>
      ))}
    </div>
  )
}

// ─── Kanban ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function KanbanCard({ card, style }: { card: any; style: typeof COL_STYLE[string] }) {
  return (
    <Link
      href={`/clients/${card.id}`}
      className={`block bg-white border ${style.border} ${style.card} rounded-lg p-3 transition-all group shadow-sm`}
    >
      <div className="text-zinc-900 text-xs font-semibold group-hover:text-[#70BF4B] transition-colors truncate mb-0.5">
        {card.clientName}
      </div>
      {card.package && (
        <div className="text-zinc-500 text-[10px] truncate mb-1.5">{card.package}</div>
      )}
      <div className="text-zinc-700 text-[10px] font-mono">{card.daysSince}d</div>
    </Link>
  )
}

function KanbanBoard() {
  const { data, isLoading, error } = useSWR("/api/dashboard/onboarding", fetcher)
  const pipeline = data?.pipeline ?? {}
  const loading = isLoading && !data && !error

  return (
    <section>
      <SectionHeader label="Onboarding Pipeline" />
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
        {COLUMNS.map(col => {
          const cards = (pipeline[col] ?? []) as unknown[]
          const style = COL_STYLE[col]
          return (
            <div key={col} className="flex-shrink-0 w-48 snap-start">
              <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                <span className={`text-[11px] font-semibold ${style.label}`}>{col}</span>
                <span className="text-[10px] text-zinc-700 ml-auto font-mono">{loading ? "—" : cards.length}</span>
              </div>
              <div className="space-y-2">
                {loading ? (
                  <>
                    <Skeleton className="h-[58px] w-full" />
                    <Skeleton className="h-[58px] w-full opacity-60" />
                  </>
                ) : cards.length === 0 ? (
                  <div className="border border-dashed border-zinc-200 rounded-lg h-14 flex items-center justify-center">
                    <span className="text-zinc-400 text-[10px]">empty</span>
                  </div>
                ) : (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  cards.map((card: any) => (
                    <KanbanCard key={card.id} card={card} style={style} />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── Activity ────────────────────────────────────────────────────────────────

function ActivityFeed() {
  const { data, isLoading, error } = useSWR("/api/dashboard/activity", fetcher, { refreshInterval: 60000 })
  const activities = data?.activities ?? []
  const loading = isLoading && !data && !error

  return (
    <section>
      <SectionHeader label="Recent Activity" />
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-2 h-2 rounded-full shrink-0" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="py-10 text-center text-zinc-700 text-sm">No recent activity</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {activities.map((item: any, i: number) => (
              <div key={item.id + i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition-colors">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.type === "client" ? "bg-[#70BF4B]" : "bg-sky-400"}`} />
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className="text-zinc-900 text-xs font-medium truncate">{item.label}</span>
                  <span className="text-zinc-500 text-xs hidden sm:inline shrink-0">— {item.action}</span>
                </div>
                <span className="text-zinc-700 text-[10px] font-mono shrink-0">
                  {item.time ? timeAgo(item.time) : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Quick Actions ───────────────────────────────────────────────────────────

function QuickActions() {
  return (
    <section>
      <SectionHeader label="Quick Actions" />
      <div className="space-y-3">
        <Link
          href="/clients/new"
          className="flex items-center gap-3 w-full bg-[#003434] hover:bg-[#004d4d] text-white font-bold text-sm px-4 py-3.5 rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-900/10 hover:shadow-emerald-900/20 active:scale-[0.98]"
        >
          <div className="bg-white/10 p-1 rounded-lg">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          Add New Client
        </Link>
        <Link
          href="/content-calendar"
          className="flex items-center gap-3 w-full bg-white border border-zinc-200 hover:border-emerald-200 text-zinc-700 hover:text-emerald-700 text-sm px-4 py-3.5 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md hover:bg-emerald-50/30"
        >
          <div className="bg-emerald-50 p-1 rounded-lg text-emerald-600">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          View Content Calendar
        </Link>
        <Link
          href="/automations"
          className="flex items-center gap-3 w-full bg-white border border-zinc-200 hover:border-emerald-200 text-zinc-700 hover:text-emerald-700 text-sm px-4 py-3.5 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md hover:bg-emerald-50/30"
        >
          <div className="bg-emerald-50 p-1 rounded-lg text-emerald-600">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          Check Automations
        </Link>
      </div>
    </section>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
      <div className="flex-1 h-px bg-zinc-100" />
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="space-y-8 pb-20 lg:pb-4">
      <div>
        <h1 className="text-zinc-900 text-xl font-bold tracking-tight">Overview</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Emozi Digital — Admin Panel</p>
      </div>

      <StatsGrid />
      <KanbanBoard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>
    </div>
  )
}
