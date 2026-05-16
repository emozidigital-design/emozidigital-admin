"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { useClient } from "../client-context"

interface EmailList {
  id: string
  client_id: string
  name: string
  contact_count: number
  created_at: string
}

export default function ListsPage() {
  const { clientId } = useClient()
  const [lists, setLists] = useState<EmailList[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ client_id: "", name: "" })
  const [adding, setAdding] = useState(false)
  const [expandedList, setExpandedList] = useState<string | null>(null)
  const [addEmail, setAddEmail] = useState("")
  const [addingContact, setAddingContact] = useState(false)
  const [importingAll, setImportingAll] = useState<string | null>(null)

  useEffect(() => {
    if (clientId) setForm(f => ({ ...f, client_id: clientId }))
  }, [clientId])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (clientId) params.set("client_id", clientId)
    fetch(`/api/email/lists?${params}`)
      .then(r => r.json())
      .then(d => setLists(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [clientId])

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
      setForm({ client_id: clientId, name: "" })
      toast.success("List created")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setAdding(false)
    }
  }

  const handleAddContact = async (listId: string) => {
    if (!addEmail) return
    setAddingContact(true)
    try {
      const res = await fetch(`/api/email/lists/${listId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Contact added to list")
      setAddEmail("")
      setLists(prev => prev.map(l => l.id === listId ? { ...l, contact_count: l.contact_count + 1 } : l))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setAddingContact(false)
    }
  }

  const handleImportAll = async (listId: string) => {
    setImportingAll(listId)
    try {
      const res = await fetch(`/api/email/lists/${listId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Imported ${data.imported} contacts`)
      setLists(prev => prev.map(l => l.id === listId ? { ...l, contact_count: data.imported } : l))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setImportingAll(null)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete list "${name}"? This also removes all contacts from the list.`)) return
    const res = await fetch(`/api/email/lists/${id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Failed to delete"); return }
    setLists(prev => prev.filter(l => l.id !== id))
    toast.success("List deleted")
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
            <div key={l.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-800">{l.name}</p>
                  <p className="text-xs text-zinc-400">{l.contact_count} contacts</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-xs text-zinc-400">{new Date(l.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  <button
                    onClick={() => { setExpandedList(expandedList === l.id ? null : l.id); setAddEmail("") }}
                    className="text-xs text-[#003434] hover:text-[#004444] underline underline-offset-2"
                  >
                    {expandedList === l.id ? "Close" : "Add contacts"}
                  </button>
                  <button onClick={() => handleDelete(l.id, l.name)} className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2">Delete</button>
                </div>
              </div>
              {expandedList === l.id && (
                <div className="border-t border-zinc-100 px-4 py-3 bg-zinc-50 space-y-2">
                  <div className="flex gap-2">
                    <input
                      className="flex-1 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white"
                      placeholder="contact@email.com"
                      type="email"
                      value={addEmail}
                      onChange={e => setAddEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleAddContact(l.id)}
                    />
                    <button
                      onClick={() => handleAddContact(l.id)}
                      disabled={addingContact}
                      className="bg-[#003434] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-[#004444] disabled:opacity-50 transition-colors"
                    >
                      {addingContact ? "Adding…" : "Add"}
                    </button>
                  </div>
                  <button
                    onClick={() => handleImportAll(l.id)}
                    disabled={importingAll === l.id}
                    className="w-full text-xs border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {importingAll === l.id ? "Importing…" : "Import all contacts for this client"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
