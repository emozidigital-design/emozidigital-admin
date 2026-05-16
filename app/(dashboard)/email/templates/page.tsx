"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"

interface Template {
  id: string
  client_id: string
  name: string
  subject: string
  html_body: string
  variables: string[]
  created_at: string
  updated_at: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Template | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ client_id: "", name: "", subject: "", html_body: "", variables: "" })
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<Template | null>(null)

  useEffect(() => {
    fetch("/api/email/templates")
      .then(r => r.json())
      .then(d => setTemplates(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        variables: form.variables.split(",").map(v => v.trim()).filter(Boolean),
      }
      const url = editing ? `/api/email/templates/${editing.id}` : "/api/email/templates"
      const method = editing ? "PATCH" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(editing ? "Template updated" : "Template created")
      if (editing) {
        setTemplates(prev => prev.map(t => t.id === data.id ? data : t))
      } else {
        setTemplates(prev => [data, ...prev])
      }
      setEditing(null)
      setCreating(false)
      setForm({ client_id: "", name: "", subject: "", html_body: "", variables: "" })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save error")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return
    await fetch(`/api/email/templates/${id}`, { method: "DELETE" })
    setTemplates(prev => prev.filter(t => t.id !== id))
    toast.success("Deleted")
  }

  const startEdit = (t: Template) => {
    setEditing(t)
    setCreating(true)
    setForm({ client_id: t.client_id, name: t.name, subject: t.subject, html_body: t.html_body, variables: t.variables.join(", ") })
  }

  const cancelEdit = () => {
    setEditing(null)
    setCreating(false)
    setForm({ client_id: "", name: "", subject: "", html_body: "", variables: "" })
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Templates</h1>
          <p className="text-sm text-zinc-500 mt-1">HTML email templates with <code className="bg-zinc-100 px-1 rounded">{"{{variable}}"}</code> placeholders</p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] transition-colors">
            New template
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={handleSave} className="bg-white border border-zinc-200 rounded-xl p-5 mb-6 space-y-3">
          <p className="text-sm font-semibold text-zinc-700">{editing ? "Edit template" : "New template"}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Client ID" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} required />
            <input className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Template name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <input className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Email subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required />
          <input className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Variables (comma-separated): name, email, company" value={form.variables} onChange={e => setForm(f => ({ ...f, variables: e.target.value }))} />
          <textarea
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#003434]/20 min-h-[240px]"
            placeholder="<h1>Hello {{name}}</h1>..."
            value={form.html_body}
            onChange={e => setForm(f => ({ ...f, html_body: e.target.value }))}
            required
          />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </button>
            <button type="button" onClick={cancelEdit} className="text-sm text-zinc-500 hover:text-zinc-700 px-4 py-2">Cancel</button>
          </div>
        </form>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <p className="font-semibold text-zinc-800">{preview.name}</p>
              <button onClick={() => setPreview(null)} className="text-zinc-400 hover:text-zinc-700 text-lg leading-none">&times;</button>
            </div>
            <p className="text-xs text-zinc-400 mb-1">Subject: <span className="text-zinc-700">{preview.subject}</span></p>
            <div className="mt-3 border border-zinc-100 rounded-lg p-4 bg-zinc-50" dangerouslySetInnerHTML={{ __html: preview.html_body }} />
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-zinc-400">No templates yet.</p>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="bg-white border border-zinc-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-800">{t.name}</p>
                <p className="text-xs text-zinc-400">{t.subject}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPreview(t)} className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2">Preview</button>
                <button onClick={() => startEdit(t)} className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2">Edit</button>
                <button onClick={() => handleDelete(t.id)} className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
