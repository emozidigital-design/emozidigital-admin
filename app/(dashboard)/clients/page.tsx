"use client"

import { useState, useMemo, type FormEvent } from "react"
import useSWR from "swr"
import { useRouter } from "next/navigation"
import { exportToCSV } from "@/lib/exportCSV"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Client = {
  id: string
  name: string
  email: string
  package: string
  tier: string
  status: string
  startDate: string | null
  mrr: number | null
  payment: string
  risk: string
  createdAt: string
}

// ─── Badge ────────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  Active:   "bg-[#70BF4B]/15 text-[#70BF4B] border-[#70BF4B]/30",
  Inactive: "bg-zinc-700/30 text-zinc-400 border-zinc-600/30",
  Pending:  "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Completed:"bg-sky-500/15 text-sky-400 border-sky-500/30",
}
const RISK_COLOR: Record<string, string> = {
  Low:    "bg-[#D0F255]/10 text-[#D0F255] border-[#D0F255]/25",
  Medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  High:   "bg-red-500/15 text-red-400 border-red-500/30",
}
const PAYMENT_COLOR: Record<string, string> = {
  Paid:    "bg-[#70BF4B]/15 text-[#70BF4B] border-[#70BF4B]/30",
  Pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Overdue: "bg-red-500/15 text-red-400 border-red-500/30",
}

function Badge({ label, colorMap }: { label: string; colorMap: Record<string, string> }) {
  if (!label) return <span className="text-zinc-600 text-xs">—</span>
  const cls = colorMap[label] ?? "bg-zinc-700/30 text-zinc-400 border-zinc-600/30"
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${cls}`}>
      {label}
    </span>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/5 ${className}`} />
}

// ─── Sort ────────────────────────────────────────────────────────────────────

type SortKey = keyof Client
type SortDir = "asc" | "desc"

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`ml-1 ${active ? "text-[#70BF4B]" : "text-zinc-700"}`}>
      {!active ? "↕" : dir === "asc" ? "↑" : "↓"}
    </span>
  )
}

// ─── Add Client Modal ─────────────────────────────────────────────────────────

const PACKAGES = ["Starter", "Growth", "Premium", "Enterprise", "Custom"]

function AddClientModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", package: "Starter", assigned_am: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) { onSuccess(); onClose() }
      else {
        const body = await res.json().catch(() => ({}))
        setError((body as { error?: string }).error ?? "Failed to create client.")
      }
    } catch {
      setError("Network error — please try again.")
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { label: "Full Name",    key: "name",        type: "text",  required: true },
    { label: "Email",        key: "email",       type: "email", required: true },
    { label: "WhatsApp",     key: "phone",       type: "tel",   required: false },
    { label: "Assigned AM",  key: "assigned_am", type: "text",  required: false },
  ] as const

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#001a1a] border border-[#003434] rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-base">Add New Client</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">
                {f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              <input
                type={f.type}
                required={f.required}
                value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full bg-[#003434] border border-[#70BF4B]/20 focus:border-[#70BF4B]/50 text-white text-sm rounded-lg px-3 py-2.5 outline-none transition-colors placeholder-zinc-600"
                placeholder={f.label}
              />
            </div>
          ))}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">
              Package
            </label>
            <select
              value={form.package}
              onChange={e => setForm(p => ({ ...p, package: e.target.value }))}
              className="w-full bg-[#003434] border border-[#70BF4B]/20 text-white text-sm rounded-lg px-3 py-2.5 outline-none"
            >
              {PACKAGES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-[#003434] text-zinc-400 hover:text-white rounded-xl text-sm transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-[#70BF4B] hover:bg-[#5faa3e] disabled:opacity-50 text-[#001a1a] font-semibold rounded-xl text-sm transition-colors">
              {loading ? "Creating…" : "Create Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split("T")[0].replace(/-/g, "")
}

export default function ClientsPage() {
  const router = useRouter()
  const { data, isLoading, mutate } = useSWR<{ clients: Client[] }>("/api/clients", fetcher)

  const [search, setSearch]   = useState("")
  const [pkgFilter, setPkg]   = useState("all")
  const [statusFilter, setSt] = useState("all")
  const [riskFilter, setRisk] = useState("all")
  const [sort, setSort]       = useState<{ key: SortKey; dir: SortDir }>({ key: "name", dir: "asc" })
  const [showModal, setShowModal] = useState(false)

  const clients = useMemo(() => data?.clients ?? [], [data])

  const packages = useMemo(() => Array.from(new Set(clients.map(c => c.package).filter(Boolean))), [clients])
  const statuses  = useMemo(() => Array.from(new Set(clients.map(c => c.status).filter(Boolean))), [clients])
  const risks     = useMemo(() => Array.from(new Set(clients.map(c => c.risk).filter(Boolean))), [clients])

  const filtered = useMemo(() => {
    let list = [...clients]
    if (search)          list = list.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()))
    if (pkgFilter !== "all")    list = list.filter(c => c.package === pkgFilter)
    if (statusFilter !== "all") list = list.filter(c => c.status  === statusFilter)
    if (riskFilter !== "all")   list = list.filter(c => c.risk    === riskFilter)
    list.sort((a, b) => {
      const av = String(a[sort.key] ?? "")
      const bv = String(b[sort.key] ?? "")
      return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return list
  }, [clients, search, pkgFilter, statusFilter, riskFilter, sort])

  function toggleSort(key: SortKey) {
    setSort(s => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" })
  }

  const COLS: { label: string; key: SortKey; render: (c: Client) => React.ReactNode }[] = [
    { label: "Name",       key: "name",      render: c => <span className="text-white font-medium text-sm">{c.name || <span className="text-zinc-500 italic">Unnamed</span>}</span> },
    { label: "Package",    key: "package",   render: c => <span className="text-zinc-300 text-sm">{c.package || "—"}</span> },
    { label: "Tier",       key: "tier",      render: c => <span className="text-zinc-400 text-sm">{c.tier || "—"}</span> },
    { label: "Status",     key: "status",    render: c => <Badge label={c.status} colorMap={STATUS_COLOR} /> },
    { label: "Start Date", key: "startDate", render: c => <span className="text-zinc-400 text-sm font-mono">{c.startDate ?? "—"}</span> },
    { label: "MRR (₹)",    key: "mrr",       render: c => <span className="text-[#D0F255] text-sm font-mono">{c.mrr != null ? `₹${c.mrr.toLocaleString("en-IN")}` : "—"}</span> },
    { label: "Payment",    key: "payment",   render: c => <Badge label={c.payment} colorMap={PAYMENT_COLOR} /> },
    { label: "Risk",       key: "risk",      render: c => <Badge label={c.risk} colorMap={RISK_COLOR} /> },
  ]

  return (
    <>
      {showModal && (
        <AddClientModal
          onClose={() => setShowModal(false)}
          onSuccess={() => mutate()}
        />
      )}

      <div className="space-y-5 pb-20 lg:pb-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold tracking-tight">Clients</h1>
            <p className="text-zinc-600 text-sm mt-0.5">
              {isLoading ? "Loading…" : `${filtered.length} of ${clients.length} client${clients.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const rows = filtered.map(c => ({
                  id:             c.id,
                  legal_name:     c.name,
                  email:          c.email,
                  status:         c.status,
                  package:        c.package,
                  tier:           c.tier,
                  monthly_value:  c.mrr ?? "",
                  payment_status: c.payment,
                  risk_profile:   c.risk,
                  contract_start: c.startDate ?? "",
                  created_at:     c.createdAt,
                }))
                exportToCSV(rows as unknown as Record<string, unknown>[], `emozi_clients_${todayStr()}.csv`)
              }}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-xl border border-[#003434] bg-[#001a1a] text-zinc-400 hover:text-white hover:border-[#70BF4B]/40 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[#70BF4B] hover:bg-[#5faa3e] text-[#001a1a] font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors shadow shadow-[#70BF4B]/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Client
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full bg-[#001f1f] border border-[#003434] focus:border-[#70BF4B]/40 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none transition-colors placeholder-zinc-600"
            />
          </div>
          {[
            { label: "Package", val: pkgFilter, set: setPkg,  opts: packages },
            { label: "Status",  val: statusFilter, set: setSt,  opts: statuses  },
            { label: "Risk",    val: riskFilter, set: setRisk, opts: risks     },
          ].map(f => (
            <select
              key={f.label}
              value={f.val}
              onChange={e => f.set(e.target.value)}
              className="bg-[#001f1f] border border-[#003434] text-zinc-300 text-sm rounded-xl px-3 py-2.5 outline-none"
            >
              <option value="all">All {f.label}s</option>
              {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[#001f1f] border border-[#003434] rounded-2xl overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#003434]">
                  {COLS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-4 py-3.5 cursor-pointer hover:text-[#70BF4B] transition-colors select-none whitespace-nowrap"
                    >
                      {col.label}
                      <SortIcon active={sort.key === col.key} dir={sort.dir} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#003434]/50">
                {isLoading
                  ? [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        {COLS.map(c => (
                          <td key={c.key} className="px-4 py-3.5">
                            <Skeleton className="h-4 w-24" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={COLS.length} className="px-4 py-16 text-center text-zinc-600 text-sm">
                        No clients match the current filters.
                      </td>
                    </tr>
                  )
                  : filtered.map(client => (
                    <tr
                      key={client.id}
                      onClick={() => router.push(`/clients/${client.id}`)}
                      className="hover:bg-[#003434]/40 cursor-pointer transition-colors group"
                    >
                      {COLS.map(col => (
                        <td key={col.key} className="px-4 py-3.5 whitespace-nowrap">
                          {col.render(client)}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-[#003434]">
            {isLoading
              ? [...Array(4)].map((_, i) => (
                  <div key={i} className="p-4 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                    <div className="flex gap-2"><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-5 w-14 rounded-full" /></div>
                  </div>
                ))
              : filtered.map(client => (
                <div
                  key={client.id}
                  onClick={() => router.push(`/clients/${client.id}`)}
                  className="p-4 flex items-start justify-between gap-3 hover:bg-[#003434]/40 cursor-pointer transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium text-sm truncate">{client.name || <span className="text-zinc-500 italic">Unnamed</span>}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{client.email || "—"}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge label={client.status}  colorMap={STATUS_COLOR}  />
                      <Badge label={client.payment} colorMap={PAYMENT_COLOR} />
                      <Badge label={client.risk}    colorMap={RISK_COLOR}    />
                    </div>
                    {client.mrr != null && (
                      <p className="text-[#D0F255] text-xs font-mono mt-1.5">₹{client.mrr.toLocaleString("en-IN")}/mo</p>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-zinc-600 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  )
}
