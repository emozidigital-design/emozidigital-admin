"use client"

import { useState, useEffect, useRef } from "react"
import toast from "react-hot-toast"
import { MoreVertical } from "lucide-react"
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

  // ⋮ dropdown
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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

  // Close dropdown on outside click
  useEffect(() => {
    if (!openMenuId) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [openMenuId])

  const handleDelete = async (id: string) => {
    setOpenMenuId(null)
    if (!confirm("Delete this template?")) return
    await fetch(`/api/email/templates/${id}`, { method: "DELETE" })
    setTemplates(prev => prev.filter(t => t.id !== id))
    toast.success("Deleted")
  }

  const handleDuplicate = async (id: string) => {
    setOpenMenuId(null)
    try {
      const res = await fetch(`/api/email/templates/${id}/duplicate`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTemplates(prev => [data, ...prev])
      toast.success("Template duplicated")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Duplicate error")
    }
  }

  const startEdit = (t: Template) => {
    setOpenMenuId(null)
    setEditorTemplate(t)
    setEditorOpen(true)
  }

  const startPreview = (t: Template) => {
    setOpenMenuId(null)
    setPreview(t)
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
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-800 truncate">{t.name}</p>
                <p className="text-xs text-zinc-400 truncate">{t.subject}</p>
              </div>

              {/* ⋮ dropdown */}
              <div
                className="relative shrink-0"
                ref={openMenuId === t.id ? menuRef : undefined}
              >
                <button
                  onClick={() => setOpenMenuId(openMenuId === t.id ? null : t.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-transparent hover:border-zinc-200 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {openMenuId === t.id && (
                  <div className="absolute right-0 top-8 z-50 bg-white border border-zinc-200 rounded-xl shadow-xl py-1.5 w-36 ring-1 ring-black/5">
                    <button
                      onClick={() => startPreview(t)}
                      className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 font-medium"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => startEdit(t)}
                      className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(t.id)}
                      className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 font-medium"
                    >
                      Duplicate
                    </button>
                    <div className="border-t border-zinc-100 my-1" />
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                )}
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
