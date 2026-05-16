"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"

interface Campaign {
  id: string
  client_id: string
  subject: string
  status: string
  scheduled_at: string | null
  sent_at: string | null
  created_at: string
  email_senders: { from_email: string; from_name: string } | null
  email_templates: { name: string } | null
  email_lists: { name: string; contact_count: number } | null
}

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600 border-zinc-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  sending: "bg-amber-50 text-amber-700 border-amber-200",
  sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ client_id: "", sender_id: "", template_id: "", list_id: "", subject: "", scheduled_at: "" })
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/email/campaigns")
      .then(r => r.json())
      .then(d => setCampaigns(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/email/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, scheduled_at: form.scheduled_at || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCampaigns(prev => [data, ...prev])
      setCreating(false)
      setForm({ client_id: "", sender_id: "", template_id: "", list_id: "", subject: "", scheduled_at: "" })
      toast.success("Campaign created")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async (id: string) => {
    if (!confirm("Send this campaign now to all eligible contacts?")) return
    setSending(id)
    try {
      const res = await fetch(`/api/email/campaigns/${id}/send`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Sent to ${data.sent} contacts${data.failed ? ` (${data.failed} failed)` : ""}`)
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: "sent" } : c))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Send error")
    } finally {
      setSending(null)
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Campaigns</h1>
          <p className="text-sm text-zinc-500 mt-1">Marketing bulk sends via AWS SES</p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] transition-colors">
            New campaign
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="bg-white border border-zinc-200 rounded-xl p-5 mb-6 space-y-3">
          <p className="text-sm font-semibold text-zinc-700">New campaign</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Client ID" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} required />
            <input className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Sender ID (UUID)" value={form.sender_id} onChange={e => setForm(f => ({ ...f, sender_id: e.target.value }))} required />
            <input className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Template ID (UUID)" value={form.template_id} onChange={e => setForm(f => ({ ...f, template_id: e.target.value }))} required />
            <input className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="List ID (UUID)" value={form.list_id} onChange={e => setForm(f => ({ ...f, list_id: e.target.value }))} required />
          </div>
          <input className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Email subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required />
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Schedule (optional — leave blank to send manually)</label>
            <input type="datetime-local" className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Create campaign"}
            </button>
            <button type="button" onClick={() => setCreating(false)} className="text-sm text-zinc-500 hover:text-zinc-700 px-4 py-2">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : campaigns.length === 0 ? (
        <p className="text-sm text-zinc-400">No campaigns yet.</p>
      ) : (
        <div className="space-y-2">
          {campaigns.map(c => (
            <div key={c.id} className="bg-white border border-zinc-200 rounded-xl px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{c.subject}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {c.email_senders?.from_name} · {c.email_templates?.name} · {c.email_lists?.name} ({c.email_lists?.contact_count} contacts)
                  </p>
                  {c.sent_at && <p className="text-xs text-zinc-400">Sent {new Date(c.sent_at).toLocaleString("en-IN")}</p>}
                  {c.scheduled_at && !c.sent_at && <p className="text-xs text-blue-500">Scheduled for {new Date(c.scheduled_at).toLocaleString("en-IN")}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLE[c.status] ?? STATUS_STYLE.draft}`}>{c.status}</span>
                  {(c.status === "draft" || c.status === "scheduled") && (
                    <button
                      onClick={() => handleSend(c.id)}
                      disabled={sending === c.id}
                      className="text-xs bg-[#003434] text-white px-3 py-1 rounded-lg hover:bg-[#004444] disabled:opacity-50 transition-colors"
                    >
                      {sending === c.id ? "Sending…" : "Send now"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
