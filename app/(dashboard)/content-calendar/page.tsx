"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type ApiResponse = {
  clients: { id: string; name: string; email: string }[]
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/5 ${className}`} />
}

const PLATFORMS = ["Instagram", "Facebook", "LinkedIn", "Twitter", "YouTube", "WhatsApp"]
const STATUSES = ["draft", "review", "scheduled", "published"]

export default function ContentCalendarPage() {
  const { data, isLoading } = useSWR<ApiResponse>("/api/clients", fetcher)

  const [search,         setSearch]         = useState("")
  const [platformFilter, setPlatformFilter] = useState("all")
  const [statusFilter,   setStatusFilter]   = useState("all")
  const [clientFilter,   setClientFilter]   = useState("all")

  const clients = useMemo(() => data?.clients ?? [], [data])

  // Aggregate content calendar from all visible client detail API responses
  // For now, show a global view placeholder with the client list
  // Full implementation would query content_calendar table directly

  return (
    <div className="space-y-6 pb-20 lg:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-zinc-600 text-sm mt-0.5">Global view across all clients</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search posts…"
            className="w-full bg-[#001f1f] border border-[#003434] focus:border-[#70BF4B]/40 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none transition-colors placeholder-zinc-600"
          />
        </div>
        <select value={clientFilter}   onChange={e => setClientFilter(e.target.value)}   className="bg-[#001f1f] border border-[#003434] text-zinc-300 text-sm rounded-xl px-3 py-2.5 outline-none">
          <option value="all">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} className="bg-[#001f1f] border border-[#003434] text-zinc-300 text-sm rounded-xl px-3 py-2.5 outline-none">
          <option value="all">All Platforms</option>
          {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={statusFilter}   onChange={e => setStatusFilter(e.target.value)}   className="bg-[#001f1f] border border-[#003434] text-zinc-300 text-sm rounded-xl px-3 py-2.5 outline-none">
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Client cards — click to see per-client calendar */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading
          ? [...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : clients
              .filter(c => clientFilter === "all" || c.id === clientFilter)
              .filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()))
              .map(client => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="bg-[#001f1f] border border-[#003434] rounded-xl p-4 hover:border-[#70BF4B]/30 transition-all group block"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#003434] to-[#70BF4B] flex items-center justify-center shrink-0">
                      <span className="text-[#D0F255] font-bold text-sm">{(client.name || client.email)[0]?.toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate group-hover:text-[#D0F255] transition-colors">{client.name || client.email}</p>
                      <p className="text-zinc-600 text-xs truncate">{client.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-xs">View calendar →</span>
                    <svg className="w-4 h-4 text-zinc-700 group-hover:text-[#70BF4B] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
      </div>

      {/* Info banner */}
      <div className="bg-[#003434]/30 border border-[#70BF4B]/15 rounded-xl p-4 flex gap-3">
        <svg className="w-5 h-5 text-[#70BF4B] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-zinc-300 text-sm font-medium">Per-client calendar is under the Content Calendar tab</p>
          <p className="text-zinc-500 text-xs mt-0.5">Click any client above, then go to the <span className="text-zinc-300">Content Calendar</span> tab to view and manage their scheduled posts.</p>
        </div>
      </div>
    </div>
  )
}
