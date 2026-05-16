"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"

interface Sender {
  id: string
  client_id: string
  from_email: string
  from_name: string
  domain: string
  dkim_status: string
  verified_at: string | null
  created_at: string
  dkim_tokens?: string[]
}

export default function SendersPage() {
  const [senders, setSenders] = useState<Sender[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ client_id: "", from_email: "", from_name: "" })
  const [newSender, setNewSender] = useState<Sender | null>(null)

  useEffect(() => {
    fetch("/api/email/senders")
      .then(r => r.json())
      .then(d => setSenders(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    try {
      const res = await fetch("/api/email/senders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNewSender(data)
      setSenders(prev => [data, ...prev])
      setForm({ client_id: "", from_email: "", from_name: "" })
      toast.success("Sender added — add DKIM records to your DNS")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error adding sender")
    } finally {
      setAdding(false)
    }
  }

  const handleVerify = async (id: string) => {
    const res = await fetch(`/api/email/senders/${id}/verify`, { method: "POST" })
    const data = await res.json()
    setSenders(prev => prev.map(s => s.id === id ? { ...s, dkim_status: data.dkim_status } : s))
    toast.success(`Status: ${data.dkim_status}`)
  }

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Delete sender ${email}?`)) return
    const res = await fetch(`/api/email/senders/${id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Failed to delete"); return }
    setSenders(prev => prev.filter(s => s.id !== id))
    toast.success("Sender deleted")
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Senders</h1>
        <p className="text-sm text-zinc-500 mt-1">Verify sending domains via AWS SES DKIM</p>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-white border border-zinc-200 rounded-xl p-5 mb-6 space-y-3">
        <p className="text-sm font-semibold text-zinc-700">Add sender domain</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
            placeholder="Client ID (UUID)"
            value={form.client_id}
            onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
            required
          />
          <input
            className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
            placeholder="noreply@yourdomain.com"
            type="email"
            value={form.from_email}
            onChange={e => setForm(f => ({ ...f, from_email: e.target.value }))}
            required
          />
          <input
            className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
            placeholder="Display Name"
            value={form.from_name}
            onChange={e => setForm(f => ({ ...f, from_name: e.target.value }))}
            required
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className="bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] transition-colors disabled:opacity-50"
        >
          {adding ? "Adding…" : "Add sender"}
        </button>
      </form>

      {/* DKIM records to copy */}
      {newSender?.dkim_tokens && newSender.dkim_tokens.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-amber-800 mb-2">Add these CNAME records to your DNS for <span className="font-mono">{newSender.domain}</span></p>
          {newSender.dkim_tokens.map(token => (
            <div key={token} className="font-mono text-xs bg-white border border-amber-100 rounded px-3 py-1.5 mb-1">
              <span className="text-zinc-500">CNAME</span> &nbsp;
              <span className="text-zinc-800">{token}._domainkey.{newSender.domain}</span>
              <span className="text-zinc-400"> → </span>
              <span className="text-zinc-800">{token}.dkim.amazonses.com</span>
            </div>
          ))}
          <p className="text-xs text-amber-600 mt-2">DNS changes can take up to 72 hours to propagate. Click "Check status" after adding the records.</p>
        </div>
      )}

      {/* Senders list */}
      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : senders.length === 0 ? (
        <p className="text-sm text-zinc-400">No senders yet.</p>
      ) : (
        <div className="space-y-2">
          {senders.map(s => (
            <div key={s.id} className="bg-white border border-zinc-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-800">{s.from_name} &lt;{s.from_email}&gt;</p>
                <p className="text-xs text-zinc-400">{s.domain}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  s.dkim_status === "verified" ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : s.dkim_status === "failed" ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}>{s.dkim_status}</span>
                <button
                  onClick={() => handleVerify(s.id)}
                  className="text-xs text-zinc-500 hover:text-zinc-800 underline underline-offset-2"
                >
                  Check status
                </button>
                <button
                  onClick={() => handleDelete(s.id, s.from_email)}
                  className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
