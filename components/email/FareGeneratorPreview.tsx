"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

interface SavedTemplate {
  id: string
  name: string
  subject: string
  html_body: string
}

interface FareGeneratorPreviewProps {
  open: boolean
  onClose: () => void
  html: string
  templateName: string
  subject: string
  clientId: string
  tagIds: string[]
  tagNames: string[]
  // When opening an existing template from ⋮ Edit/Preview
  existingTemplateId?: string
  onSaved: (template: SavedTemplate) => void
  onEditRequested: (html: string, name: string, subject: string) => void
}

export default function FareGeneratorPreview({
  open,
  onClose,
  html,
  templateName: initialTemplateName,
  subject: initialSubject,
  clientId,
  tagIds,
  tagNames,
  existingTemplateId,
  onSaved,
  onEditRequested,
}: FareGeneratorPreviewProps) {
  const router = useRouter()
  const [editableName, setEditableName]       = useState(initialTemplateName)
  const [editableSubject, setEditableSubject] = useState(initialSubject)
  const [saving, setSaving]                   = useState(false)
  // For new templates: track saved state; for existing: always "saved"
  const [savedTemplate, setSavedTemplate]     = useState<SavedTemplate | null>(
    existingTemplateId
      ? { id: existingTemplateId, name: initialTemplateName, subject: initialSubject, html_body: html }
      : null
  )

  if (!open) return null

  const isExisting = !!existingTemplateId
  const effectiveId = savedTemplate?.id ?? existingTemplateId

  async function handleSave() {
    setSaving(true)
    try {
      let res: Response
      if (isExisting) {
        // Update existing template
        res = await fetch(`/api/email/templates/${existingTemplateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editableName || initialTemplateName,
            subject: editableSubject,
            html_body: html,
          }),
        })
      } else {
        // Create new template
        res = await fetch("/api/email/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: clientId,
            name: editableName || initialTemplateName,
            subject: editableSubject,
            html_body: html,
            variables: ["agent_name"],
            template_type: "campaign",
          }),
        })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to save template")
      setSavedTemplate(data)
      toast.success(isExisting ? "Template updated!" : "Template saved!")
      onSaved(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  function handlePostAsCampaign() {
    if (!effectiveId) return
    const params = new URLSearchParams({
      mode: "campaign",
      template_id: effectiveId,
      subject: editableSubject,
    })
    tagIds.forEach(id => params.append("tag_id", id))
    router.push(`/email/newsletters?${params.toString()}`)
  }

  function handleEdit() {
    onEditRequested(html, editableName || initialTemplateName, editableSubject)
    onClose()
  }

  const saveLabel = isExisting
    ? (saving ? "Updating…" : savedTemplate ? "✓ Updated" : "Update Template")
    : (saving ? "Saving…"   : savedTemplate ? "✓ Saved"   : "Save Template")

  const saveCls = savedTemplate && !saving
    ? "bg-[#70BF4B] text-white cursor-default"
    : "bg-[#D0F255] text-[#003434] hover:bg-[#c5eb4a] disabled:opacity-50"

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">

      {/* Header bar */}
      <div className="h-14 bg-[#003434] flex items-center px-4 gap-3 shrink-0">
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white transition-colors text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10"
        >
          &times;
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{editableName || initialTemplateName}</p>
          <p className="text-white/50 text-xs truncate hidden sm:block">{editableSubject}</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Edit in block editor */}
          <button
            onClick={handleEdit}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-white border border-white/30 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>

          {/* Save / Update Template */}
          <button
            onClick={(savedTemplate && !isExisting) ? undefined : handleSave}
            disabled={saving}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${saveCls}`}
          >
            {saving && (
              <span className="w-3.5 h-3.5 border-2 border-[#003434]/30 border-t-[#003434] rounded-full animate-spin" />
            )}
            {saveLabel}
          </button>

          {/* Post as Campaign — always enabled for existing templates */}
          <button
            onClick={handlePostAsCampaign}
            disabled={!effectiveId}
            title={!effectiveId ? "Save template first to post as campaign" : "Open in campaign creator"}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white border border-white/30 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span className="hidden sm:inline">Post as Campaign</span>
            <span className="sm:hidden">Post</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex">

        {/* Left metadata panel */}
        <div className="w-64 xl:w-72 border-r border-zinc-200 bg-zinc-50 flex flex-col p-4 gap-4 overflow-y-auto shrink-0 hidden md:flex">

          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Template Name</label>
            <input
              type="text"
              value={editableName}
              onChange={e => setEditableName(e.target.value)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Subject Line</label>
            <textarea
              value={editableSubject}
              onChange={e => setEditableSubject(e.target.value)}
              rows={3}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white resize-none leading-relaxed"
            />
          </div>

          {tagNames.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Target Tags</label>
              <div className="flex flex-wrap gap-1">
                {tagNames.map((name, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#003434]/10 text-[#003434] border border-[#003434]/20 font-medium">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Variables</label>
            <div className="flex flex-wrap gap-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#003434]/10 text-[#003434] border border-[#003434]/20 font-mono">
                {"{{agent_name}}"}
              </span>
            </div>
          </div>

          <div className="mt-auto">
            {isExisting ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 font-medium">
                  Editing existing template. Click &ldquo;Update Template&rdquo; to save changes.
                </p>
              </div>
            ) : savedTemplate ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-xs text-emerald-700 font-medium">Template saved. You can now post as campaign.</p>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700 font-medium">Save template first to enable campaign posting.</p>
              </div>
            )}
          </div>

          {/* Mobile edit button */}
          <button
            onClick={handleEdit}
            className="md:hidden w-full px-3 py-2 text-sm text-[#003434] border border-[#003434]/30 rounded-lg hover:bg-[#003434]/5 transition-colors"
          >
            Open in Editor
          </button>
        </div>

        {/* Right: iframe preview */}
        <div className="flex-1 overflow-hidden bg-zinc-100 flex flex-col">
          <div className="shrink-0 px-4 py-2 bg-white border-b border-zinc-200 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <div className="flex-1 mx-3 h-6 bg-zinc-100 rounded text-xs text-zinc-400 flex items-center px-2">
              Email Preview
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="mx-auto max-w-3xl bg-white shadow-sm rounded">
              <iframe
                srcDoc={html}
                className="w-full"
                style={{ height: "80vh", border: "none" }}
                sandbox="allow-same-origin"
                title="Fare email preview"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
