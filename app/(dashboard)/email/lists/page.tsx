"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"

interface EmailList {
  id: string
  client_id: string
  name: string
  contact_count: number
  created_at: string
}

export default function ListsPage() {
  const [lists, setLists] = useState<EmailList[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ client_id: "", name: "" })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetch("/api/email/lists")
      .then(r => r.json())
      .then(d => setLists(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    try {
      const res = await fetch("/api/email/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLists(prev => [data, ...prev])
      setForm({ client_id: "", name: "" })
      toast.success("List created")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Lists</h1>
        <p className="text-sm text-zinc-500 mt-1">Named contact segments per client</p>
      </div>

      <form onSubmit={handleAdd} className="bg-white border border-zinc-200 rounded-xl p-5 mb-6 space-y-3">
        <p className="text-sm font-semibold text-zinc-700">Create list</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
            placeholder="Client ID"
            value={form.client_id}
            onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
            required
          />
          <input
            className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
            placeholder="List name (e.g. Newsletter Q1)"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
        </div>
        <button type="submit" disabled={adding} className="bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] disabled:opacity-50 transition-colors">
          {adding ? "Creating…" : "Create list"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : lists.length === 0 ? (
        <p className="text-sm text-zinc-400">No lists yet.</p>
      ) : (
        <div className="space-y-2">
          {lists.map(l => (
            <div key={l.id} className="bg-white border border-zinc-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-800">{l.name}</p>
                <p className="text-xs text-zinc-400">{l.contact_count} contacts</p>
              </div>
              <p className="text-xs text-zinc-400">{new Date(l.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
