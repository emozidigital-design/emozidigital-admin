"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import useSWR from "swr"
import Link from "next/link"
import { CHECKLIST_ITEMS, PHASE_TITLES, type ChecklistItem } from "@/lib/checklist-items"

// ─── Types ────────────────────────────────────────────────────────────────────

type DbRow = {
  item_key: string
  completed: boolean
  completed_at: string | null
  completed_by: string | null
}

type ClientSummary = {
  client: { id: string; legal_name: string | null; email: string }
  error?: string
}

// ─── Fetcher ─────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/5 ${className}`} />
}

const OWNER_STYLES: Record<ChecklistItem["owner"], string> = {
  Client: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Team:   "bg-[#70BF4B]/15 text-[#70BF4B] border-[#70BF4B]/30",
  AI:     "bg-purple-500/15 text-purple-400 border-purple-500/30",
}
const PRIORITY_STYLES: Record<ChecklistItem["priority"], string> = {
  High:   "bg-red-500/15 text-red-400 border-red-500/30",
  Medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Low:    "bg-zinc-700/30 text-zinc-500 border-zinc-600/30",
}
const PHASE_ACCENT: Record<number, string> = {
  0: "#f87171", 1: "#fb923c", 2: "#fbbf24", 3: "#a3e635",
  4: "#34d399", 5: "#22d3ee", 6: "#60a5fa", 7: "#a78bfa",
  8: "#f472b6", 9: "#D0F255",
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, max, color = "#70BF4B", thin = false }: {
  value: number; max: number; color?: string; thin?: boolean
}) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div className={`w-full bg-[#003434] rounded-full overflow-hidden ${thin ? "h-1" : "h-2"}`}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

// ─── CheckItem ────────────────────────────────────────────────────────────────

function CheckItem({
  item,
  completed,
  onToggle,
}: {
  item: ChecklistItem
  completed: boolean
  onToggle: (key: string, next: boolean) => void
}) {
  return (
    <label
      className={`flex items-start gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all group select-none
        ${completed
          ? "bg-[#70BF4B]/5 border border-[#70BF4B]/15"
          : "bg-[#001f1f] border border-[#003434] hover:border-[#70BF4B]/25"
        }`}
    >
      {/* Custom checkbox */}
      <span
        onClick={() => onToggle(item.key, !completed)}
        className={`mt-0.5 shrink-0 w-4.5 h-4.5 rounded flex items-center justify-center border transition-all
          ${completed
            ? "bg-[#70BF4B] border-[#70BF4B] text-[#001a1a]"
            : "border-[#003434] bg-[#001a1a] group-hover:border-[#70BF4B]/50"
          }`}
        style={{ minWidth: "1.125rem", minHeight: "1.125rem" }}
      >
        {completed && (
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>

      {/* Label */}
      <span
        onClick={() => onToggle(item.key, !completed)}
        className={`flex-1 text-sm leading-relaxed transition-colors ${
          completed ? "text-zinc-500 line-through" : "text-zinc-200"
        }`}
      >
        {item.label}
      </span>

      {/* Badges */}
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end print:hidden">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${OWNER_STYLES[item.owner]}`}>
          {item.owner}
        </span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[item.priority]}`}>
          {item.priority}
        </span>
      </div>
    </label>
  )
}

// ─── PhaseAccordion ───────────────────────────────────────────────────────────

function PhaseAccordion({
  phase,
  items,
  completedKeys,
  onToggle,
  defaultOpen,
}: {
  phase: number
  items: ChecklistItem[]
  completedKeys: Set<string>
  onToggle: (key: string, next: boolean) => void
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const done   = items.filter(i => completedKeys.has(i.key)).length
  const total  = items.length
  const accent = PHASE_ACCENT[phase] ?? "#70BF4B"
  const allDone = done === total

  return (
    <div className={`rounded-xl border overflow-hidden transition-colors ${allDone ? "border-[#70BF4B]/25" : "border-[#003434]"}`}>
      {/* Accordion header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-[#001f1f] hover:bg-[#002a2a] transition-colors text-left"
      >
        {/* Phase number bubble */}
        <span
          className={`shrink-0 w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center text-[#001a1a] transition-all`}
          style={{ background: allDone ? "#70BF4B" : accent }}
        >
          {allDone ? (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : phase}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-white text-sm font-semibold">{PHASE_TITLES[phase]}</span>
            <span className="text-zinc-500 text-xs shrink-0">{done}/{total}</span>
          </div>
          <ProgressBar value={done} max={total} color={accent} thin />
        </div>

        <svg
          className={`shrink-0 w-4 h-4 text-zinc-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Items */}
      {open && (
        <div className="bg-[#001a1a] p-3 space-y-1.5 border-t border-[#003434]">
          {items.map(item => (
            <CheckItem
              key={item.key}
              item={item}
              completed={completedKeys.has(item.key)}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

type FilterOwner   = "all" | "Client" | "Team" | "AI"
type FilterPhase   = "all" | number
type FilterView    = "all" | "incomplete"
type FilterPriority = "all" | "High" | "Medium" | "Low"

export default function ChecklistPage({ params }: { params: { id: string } }) {
  const clientId = params.id

  const { data: clientData } = useSWR<ClientSummary>(`/api/clients/${clientId}`, fetcher)
  const { data: checkData, isLoading, mutate } = useSWR<{ items: DbRow[] }>(
    `/api/clients/${clientId}/checklist`, fetcher
  )

  const [filterOwner,    setFilterOwner]    = useState<FilterOwner>("all")
  const [filterPhase,    setFilterPhase]    = useState<FilterPhase>("all")
  const [filterView,     setFilterView]     = useState<FilterView>("all")
  const [filterPriority, setFilterPriority] = useState<FilterPriority>("all")

  // Build Set<key> of completed items (optimistic)
  const [localCompleted, setLocalCompleted] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (checkData?.items) {
      setLocalCompleted(new Set(checkData.items.filter(r => r.completed).map(r => r.item_key)))
    }
  }, [checkData])

  const handleToggle = useCallback(async (key: string, next: boolean) => {
    // Optimistic update
    setLocalCompleted(prev => {
      const s = new Set(prev)
      if (next) s.add(key); else s.delete(key)
      return s
    })
    try {
      const res = await fetch(`/api/clients/${clientId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_key: key, completed: next }),
      })
      if (!res.ok) throw new Error("Save failed")
      mutate()
    } catch {
      // Revert on error
      setLocalCompleted(prev => {
        const s = new Set(prev)
        if (next) s.delete(key); else s.add(key)
        return s
      })
    }
  }, [clientId, mutate])

  // Derived counts
  const totalItems     = CHECKLIST_ITEMS.length
  const completedCount = localCompleted.size
  const overallPct     = Math.round((completedCount / totalItems) * 100)

  // Filtered items
  const filteredItems = useMemo(() => {
    return CHECKLIST_ITEMS.filter(item => {
      if (filterOwner    !== "all" && item.owner    !== filterOwner)    return false
      if (filterPhase    !== "all" && item.phase    !== filterPhase)    return false
      if (filterPriority !== "all" && item.priority !== filterPriority) return false
      if (filterView     === "incomplete" && localCompleted.has(item.key)) return false
      return true
    })
  }, [filterOwner, filterPhase, filterView, filterPriority, localCompleted])

  // Group by phase
  const byPhase = useMemo(() => {
    const map = new Map<number, ChecklistItem[]>()
    for (const item of filteredItems) {
      if (!map.has(item.phase)) map.set(item.phase, [])
      map.get(item.phase)!.push(item)
    }
    return map
  }, [filteredItems])

  const phases = Array.from({ length: 10 }, (_, i) => i).filter(p => byPhase.has(p))

  const clientName = clientData?.client?.legal_name || clientData?.client?.email || clientId

  // Print handler
  function handlePrint() {
    window.print()
  }

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-page { background: white !important; padding: 0 !important; }
        }
      `}</style>

      <div className="space-y-5 pb-20 lg:pb-4 max-w-4xl print-page">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-zinc-500 print:hidden flex-wrap">
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <span>/</span>
          <Link href="/clients" className="hover:text-white transition-colors">Clients</Link>
          <span>/</span>
          <Link href={`/clients/${clientId}`} className="hover:text-white transition-colors">
            {clientName}
          </Link>
          <span>/</span>
          <span className="text-zinc-300">Checklist</span>
        </nav>

        {/* Header */}
        <div className="bg-[#001f1f] border border-[#003434] rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-white text-xl font-bold tracking-tight">
                Operational Checklist
              </h1>
              <p className="text-zinc-500 text-sm mt-0.5 truncate">{clientName}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 print:hidden">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-[#003434] bg-[#001a1a] text-zinc-400 hover:text-white hover:border-[#70BF4B]/40 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / PDF
              </button>
            </div>
          </div>

          {/* Overall progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400 font-medium">{completedCount} of {totalItems} items complete</span>
              <span className="text-[#D0F255] font-mono font-semibold">{overallPct}%</span>
            </div>
            <ProgressBar value={completedCount} max={totalItems} />
          </div>

          {/* Phase mini-summary */}
          <div className="mt-4 grid grid-cols-5 sm:grid-cols-10 gap-1.5 print:hidden">
            {Array.from({ length: 10 }, (_, i) => i).map(p => {
              const phaseItems = CHECKLIST_ITEMS.filter(x => x.phase === p)
              const pDone = phaseItems.filter(x => localCompleted.has(x.key)).length
              const allDone = pDone === phaseItems.length
              return (
                <button
                  key={p}
                  onClick={() => setFilterPhase(filterPhase === p ? "all" : p)}
                  title={PHASE_TITLES[p]}
                  className={`relative rounded-lg p-1.5 transition-all border ${
                    filterPhase === p
                      ? "border-[#70BF4B]/50 bg-[#70BF4B]/10"
                      : "border-[#003434] hover:border-[#003434]/80"
                  }`}
                >
                  <div className="text-[10px] font-bold text-center mb-1" style={{ color: PHASE_ACCENT[p] }}>
                    {p}
                  </div>
                  <div className="w-full bg-[#003434] rounded-full h-1">
                    <div
                      className="h-1 rounded-full transition-all"
                      style={{ width: `${Math.round((pDone / phaseItems.length) * 100)}%`, background: allDone ? "#70BF4B" : PHASE_ACCENT[p] }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 print:hidden">
          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden border border-[#003434] shrink-0">
            {(["all","incomplete"] as FilterView[]).map(v => (
              <button
                key={v}
                onClick={() => setFilterView(v)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  filterView === v
                    ? "bg-[#003434] text-[#D0F255]"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                {v === "all" ? "All items" : "Incomplete only"}
              </button>
            ))}
          </div>

          {/* Owner filter */}
          <select
            value={filterOwner}
            onChange={e => setFilterOwner(e.target.value as FilterOwner)}
            className="bg-[#001f1f] border border-[#003434] text-zinc-300 text-xs rounded-xl px-3 py-2 outline-none"
          >
            <option value="all">All owners</option>
            <option value="Team">Team</option>
            <option value="Client">Client</option>
          </select>

          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as FilterPriority)}
            className="bg-[#001f1f] border border-[#003434] text-zinc-300 text-xs rounded-xl px-3 py-2 outline-none"
          >
            <option value="all">All priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Clear filters */}
          {(filterOwner !== "all" || filterPhase !== "all" || filterView !== "all" || filterPriority !== "all") && (
            <button
              onClick={() => { setFilterOwner("all"); setFilterPhase("all"); setFilterView("all"); setFilterPriority("all") }}
              className="px-3 py-2 text-xs text-zinc-500 hover:text-white border border-[#003434] rounded-xl transition-colors"
            >
              Clear filters
            </button>
          )}

          <div className="ml-auto text-xs text-zinc-600 self-center">
            {filteredItems.length} items shown
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        )}

        {/* Phases */}
        {!isLoading && (
          <div className="space-y-2">
            {phases.length === 0 ? (
              <div className="bg-[#001f1f] border border-[#003434] rounded-xl py-12 text-center">
                <p className="text-zinc-500 text-sm">No items match the current filters.</p>
              </div>
            ) : phases.map(phase => (
              <PhaseAccordion
                key={phase}
                phase={phase}
                items={byPhase.get(phase)!}
                completedKeys={localCompleted}
                onToggle={handleToggle}
                defaultOpen={filterPhase === phase || (filterPhase === "all" && phase <= 1)}
              />
            ))}
          </div>
        )}

        {/* Print summary */}
        <div className="hidden print:block text-sm text-black mt-4">
          <p>Client: {clientName} — Printed: {new Date().toLocaleDateString()}</p>
          <p>{completedCount}/{totalItems} items complete ({overallPct}%)</p>
        </div>
      </div>
    </>
  )
}
