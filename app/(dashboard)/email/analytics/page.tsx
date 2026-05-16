"use client"

import { useState, useEffect } from "react"
import { useClient } from "../client-context"

interface Campaign {
  id: string
  subject: string
  status: string
  sent_at: string | null
  email_lists: { contact_count: number } | null
}

interface Stats {
  total: number
  sent: number
  delivered: number
  bounced: number
  failed: number
  opens: number
  clicks: number
  complaints: number
}

export default function AnalyticsPage() {
  const { clientId } = useClient()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState<Record<string, Stats>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (clientId) params.set("client_id", clientId)
    fetch(`/api/email/campaigns?${params}`)
      .then(r => r.json())
      .then(async (data: Campaign[]) => {
        const sent = Array.isArray(data) ? data.filter(c => c.status === "sent") : []
        setCampaigns(sent)
        const results = await Promise.all(
          sent.map(c => fetch(`/api/email/analytics/${c.id}`).then(r => r.json()).then(s => ({ id: c.id, s })))
        )
        const map: Record<string, Stats> = {}
        for (const { id, s } of results) map[id] = s
        setStats(map)
      })
      .finally(() => setLoading(false))
  }, [clientId])

  const pct = (n: number, total: number) => total ? `${((n / total) * 100).toFixed(1)}%` : "—"

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Analytics</h1>
        <p className="text-sm text-zinc-500 mt-1">Opens, clicks, bounces per sent campaign</p>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : campaigns.length === 0 ? (
        <p className="text-sm text-zinc-400">No sent campaigns yet.</p>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const s = stats[c.id]
            return (
              <div key={c.id} className="bg-white border border-zinc-200 rounded-xl px-5 py-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-800">{c.subject}</p>
                    {c.sent_at && <p className="text-xs text-zinc-400">{new Date(c.sent_at).toLocaleString("en-IN")}</p>}
                  </div>
                  <span className="text-xs font-mono text-zinc-400">{s?.total ?? "…"} recipients</span>
                </div>
                {s ? (
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Delivered", value: s.delivered, pctOf: s.total, color: "text-emerald-700" },
                      { label: "Opens", value: s.opens, pctOf: s.total, color: "text-blue-600" },
                      { label: "Clicks", value: s.clicks, pctOf: s.total, color: "text-violet-600" },
                      { label: "Bounces", value: s.bounced, pctOf: s.total, color: "text-red-500" },
                    ].map(m => (
                      <div key={m.label} className="bg-zinc-50 rounded-lg px-3 py-2.5">
                        <p className={`text-lg font-semibold ${m.color}`}>{m.value}</p>
                        <p className="text-xs text-zinc-400">{m.label} · {pct(m.value, m.pctOf)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">Loading stats…</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
