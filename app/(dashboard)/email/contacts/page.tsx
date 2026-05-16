"use client"

import { useState, useEffect, useRef } from "react"
import toast from "react-hot-toast"

interface Contact {
  id: string
  client_id: string
  email: string
  name: string | null
  subscribed: boolean
  bounced: boolean
  complained: boolean
  created_at: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [form, setForm] = useState({ client_id: "", email: "", name: "" })
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importClientId, setImportClientId] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    fetch(`/api/email/contacts?${params}`)
      .then(r => r.json())
      .then(d => setContacts(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [search])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    try {
      const res = await fetch("/api/email/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Contact added")
      setForm({ client_id: "", email: "", name: "" })
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Delete contact ${email}?`)) return
    const res = await fetch(`/api/email/contacts/${id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Failed to delete"); return }
    setContacts(prev => prev.filter(c => c.id !== id))
    toast.success("Contact deleted")
  }

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file || !importClientId) {
      toast.error("Select a client ID and CSV file")
      return
    }
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append("client_id", importClientId)
      fd.append("file", file)
      const res = await fetch("/api/email/contacts/import", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Imported ${data.imported} contacts`)
      if (fileRef.current) fileRef.current.value = ""
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Import error")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Contacts</h1>
        <p className="text-sm text-zinc-500 mt-1">Subscriber list — CSV import, manual add, or synced from leads</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {/* Manual add */}
        <form onSubmit={handleAdd} className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-zinc-700">Add contact</p>
          <input className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Client ID" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} required />
          <input className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="email@example.com" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          <input className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Name (optional)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <button type="submit" disabled={adding} className="bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] transition-colors disabled:opacity-50 w-full">
            {adding ? "Adding…" : "Add contact"}
          </button>
        </form>

        {/* CSV import */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-zinc-700">CSV import</p>
          <p className="text-xs text-zinc-400">CSV must have an <code className="bg-zinc-100 px-1 rounded">email</code> column. Optional: <code className="bg-zinc-100 px-1 rounded">name</code>.</p>
          <input className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Client ID" value={importClientId} onChange={e => setImportClientId(e.target.value)} />
          <input ref={fileRef} type="file" accept=".csv" className="w-full text-sm text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200" />
          <button onClick={handleImport} disabled={importing} className="bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] transition-colors disabled:opacity-50 w-full">
            {importing ? "Importing…" : "Import CSV"}
          </button>
        </div>
      </div>

      {/* Search + list */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100">
          <input
            className="w-full text-sm focus:outline-none placeholder:text-zinc-400"
            placeholder="Search by email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <p className="text-sm text-zinc-400 px-4 py-6">Loading…</p>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-zinc-400 px-4 py-6">No contacts found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Added</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                  <td className="px-4 py-2.5 text-zinc-800">{c.email}</td>
                  <td className="px-4 py-2.5 text-zinc-500">{c.name ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {c.bounced ? <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">bounced</span>
                    : c.complained ? <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">complained</span>
                    : c.subscribed ? <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">subscribed</span>
                    : <span className="text-xs bg-zinc-100 text-zinc-500 border border-zinc-200 px-2 py-0.5 rounded-full">unsubscribed</span>}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400 text-xs">{new Date(c.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => handleDelete(c.id, c.email)} className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
