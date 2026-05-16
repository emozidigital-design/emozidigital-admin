"use client"

import { useState, useEffect, useMemo } from "react"

interface Lead {
  id: string
  name: string
  email: string
  client_id: string | null
  client_name: string | null
  display_client_name: string | null
  source: string
  submission_count: number
  created_at: string
  last_submitted_at: string
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Filters
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [minCount, setMinCount] = useState("")
  const [search, setSearch] = useState("")
  const [clientFilter, setClientFilter] = useState("")

  useEffect(() => {
    const params = new URLSearchParams()
    if (dateFrom) params.set("date_from", dateFrom)
    if (dateTo) params.set("date_to", new Date(dateTo + "T23:59:59").toISOString())
    if (minCount) params.set("min_count", minCount)
    if (clientFilter) params.set("client_id", clientFilter)

    setLoading(true)
    fetch(`/api/leads?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setLeads(d.leads)
        else setError(d.error ?? "Failed to load leads")
      })
      .catch(() => setError("Failed to load leads"))
      .finally(() => setLoading(false))
  }, [dateFrom, dateTo, minCount, clientFilter])

  const filtered = useMemo(() => {
    if (!search.trim()) return leads
    const q = search.toLowerCase()
    return leads.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      (l.display_client_name ?? l.client_name ?? "").toLowerCase().includes(q)
    )
  }, [leads, search])

  const clientOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { id: string; name: string }[] = []
    leads.forEach(l => {
      if (l.client_id && !seen.has(l.client_id)) {
        seen.add(l.client_id)
        opts.push({ id: l.client_id, name: l.display_client_name ?? l.client_name ?? l.client_id })
      }
    })
    return opts
  }, [leads])

  return (
    <div className="min-h-screen bg-zinc-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Leads</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {filtered.length} lead{filtered.length !== 1 ? "s" : ""} across all clients
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Search</label>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name or email…"
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 outline-none focus:border-[#003434] w-48 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Client</label>
            <select
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 outline-none focus:border-[#003434] w-44 transition-colors"
            >
              <option value="">All clients</option>
              {clientOptions.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">From date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 outline-none focus:border-[#003434] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">To date</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 outline-none focus:border-[#003434] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Min submissions</label>
            <input
              type="number"
              min="1"
              value={minCount}
              onChange={e => setMinCount(e.target.value)}
              placeholder="Any"
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 outline-none focus:border-[#003434] w-28 transition-colors"
            />
          </div>

          {(dateFrom || dateTo || minCount || clientFilter || search) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); setMinCount(""); setClientFilter(""); setSearch("") }}
              className="text-sm text-zinc-500 hover:text-zinc-800 underline transition-colors self-end pb-2"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
          {error && (
            <div className="p-6 text-red-500 text-sm">{error}</div>
          )}

          {!error && loading && (
            <div className="p-12 text-center text-zinc-400 text-sm">Loading leads…</div>
          )}

          {!error && !loading && filtered.length === 0 && (
            <div className="p-12 text-center text-zinc-400 text-sm">No leads found</div>
          )}

          {!error && !loading && filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-zinc-500 text-[11px] uppercase tracking-wide w-12">#</th>
                    <th className="px-4 py-3 font-semibold text-zinc-500 text-[11px] uppercase tracking-wide">Name</th>
                    <th className="px-4 py-3 font-semibold text-zinc-500 text-[11px] uppercase tracking-wide">Email</th>
                    <th className="px-4 py-3 font-semibold text-zinc-500 text-[11px] uppercase tracking-wide">Client</th>
                    <th className="px-4 py-3 font-semibold text-zinc-500 text-[11px] uppercase tracking-wide">Submissions</th>
                    <th className="px-4 py-3 font-semibold text-zinc-500 text-[11px] uppercase tracking-wide whitespace-nowrap">First seen</th>
                    <th className="px-4 py-3 font-semibold text-zinc-500 text-[11px] uppercase tracking-wide whitespace-nowrap">Last seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.map((lead, i) => (
                    <tr key={lead.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 text-zinc-400 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-zinc-900">{lead.name}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        <a href={`mailto:${lead.email}`} className="hover:text-[#003434] transition-colors">{lead.email}</a>
                      </td>
                      <td className="px-4 py-3">
                        {(lead.display_client_name ?? lead.client_name) ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#003434]/10 text-[#003434]">
                            {lead.display_client_name ?? lead.client_name}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${lead.submission_count > 1 ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-500"}`}>
                          {lead.submission_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap tabular-nums">
                        {new Date(lead.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap tabular-nums">
                        {new Date(lead.last_submitted_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
