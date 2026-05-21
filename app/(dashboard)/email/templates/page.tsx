"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { useClient } from "../client-context"
import EmailEditorModal from "@/components/email/EmailEditorModal"

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
  const { clientId } = useClient()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<Template | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorTemplate, setEditorTemplate] = useState<Template | null>(null)

  async function fetchTemplates() {
    setLoading(true)
    const params = new URLSearchParams()
    if (clientId) params.set("client_id", clientId)
    const res = await fetch(`/api/email/templates?${params}`)
    const data = await res.json()
    setTemplates(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    fetchTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return
    await fetch(`/api/email/templates/${id}`, { method: "DELETE" })
    setTemplates(prev => prev.filter(t => t.id !== id))
    toast.success("Deleted")
  }

  const startEdit = (t: Template) => {
    setEditorTemplate(t)
    setEditorOpen(true)
  }

  const handleEditorSaved = () => {
    fetchTemplates()
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Templates</h1>
          <p className="text-sm text-zinc-500 mt-1">
            HTML email templates with{" "}
            <code className="bg-zinc-100 px-1 rounded">{"{{variable}}"}</code> placeholders
          </p>
        </div>
        <button
          onClick={() => { setEditorTemplate(null); setEditorOpen(true) }}
          className="bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] transition-colors"
        >
          New template
        </button>
      </div>

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between mb-4">
              <p className="font-semibold text-zinc-800">{preview.name}</p>
              <button onClick={() => setPreview(null)} className="text-zinc-400 hover:text-zinc-700 text-lg leading-none">
                &times;
              </button>
            </div>
            <p className="text-xs text-zinc-400 mb-1">
              Subject: <span className="text-zinc-700">{preview.subject}</span>
            </p>
            <div
              className="mt-3 border border-zinc-100 rounded-lg p-4 bg-zinc-50"
              dangerouslySetInnerHTML={{ __html: preview.html_body }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-zinc-400">No templates yet. Create one to get started.</p>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div
              key={t.id}
              className="bg-white border border-zinc-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-sm font-medium text-zinc-800">{t.name}</p>
                <p className="text-xs text-zinc-400">{t.subject}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreview(t)}
                  className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2"
                >
                  Preview
                </button>
                <button
                  onClick={() => startEdit(t)}
                  className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <EmailEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        clientId={clientId}
        initialTemplate={editorTemplate ?? undefined}
        onSaved={handleEditorSaved}
      />
    </div>
  )
}
