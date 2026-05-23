"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import toast from "react-hot-toast"
import { useClient } from "../client-context"

interface EmailTag { id: string; name: string; contact_count?: number }
interface ContactRow {
  id: string; first_name?: string; last_name?: string; email: string; phone?: string
}

type DialogState = { title: string; message: string; onConfirm: () => void } | null
type DetailTag = EmailTag | null

// ─── Contact table ────────────────────────────────────────────────────────────

function ContactTable({
  tag, contacts, loading, search, onSearchChange, onRemove, removingId,
}: {
  tag: EmailTag
  contacts: ContactRow[]; loading: boolean
  search: string; onSearchChange: (v: string) => void
  onRemove: (contactId: string) => void; removingId: string | null
}) {
  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.toLowerCase()
    return !q || name.includes(q) || c.email.toLowerCase().includes(q) || (c.phone ?? "").includes(q)
  })

  return (
    <div className="mt-3 border-t border-zinc-100 pt-3">
      {/* Search */}
      <div className="relative mb-3">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search contacts…"
          className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
        />
      </div>

      {loading ? (
        <div className="py-6 text-center">
          <div className="w-4 h-4 border-2 border-[#003434]/20 border-t-[#003434] rounded-full animate-spin mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-zinc-400 py-4 text-center">
          {search ? "No contacts match your search." : "No contacts with this tag yet."}
        </p>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[28px_1fr_1fr_1fr_64px] gap-0 px-2 py-1.5 bg-zinc-50 rounded-lg mb-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">#</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Name</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Email</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Phone</span>
            <span />
          </div>
          <div className="divide-y divide-zinc-50 max-h-64 overflow-y-auto rounded-lg border border-zinc-100">
            {filtered.map((c, idx) => (
              <div
                key={c.id}
                className={`grid grid-cols-[28px_1fr_1fr_1fr_64px] gap-0 px-2 py-2 items-center ${idx % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}`}
              >
                <span className="text-[10px] text-zinc-400 tabular-nums">{idx + 1}</span>
                <span className="text-xs text-zinc-800 font-medium truncate pr-2">
                  {[c.first_name, c.last_name].filter(Boolean).join(" ") || <span className="text-zinc-400 italic font-normal">—</span>}
                </span>
                <span className="text-xs text-zinc-600 truncate pr-2">{c.email}</span>
                <span className="text-xs text-zinc-500 truncate pr-2">{c.phone || <span className="text-zinc-300">—</span>}</span>
                <div className="flex justify-end">
                  <button
                    onClick={() => onRemove(c.id)}
                    disabled={removingId === c.id}
                    className="text-[10px] text-red-400 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    {removingId === c.id ? "…" : "Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-zinc-400 mt-1.5 px-1">
            {filtered.length} of {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
          </p>
        </>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TagsPage() {
  const { clientId } = useClient()

  const [allTags, setAllTags] = useState<EmailTag[]>([])
  const [loading, setLoading] = useState(true)
  const [newTagName, setNewTagName] = useState("")
  const [creating, setCreating] = useState(false)

  // Inline rename
  const [renamingTagId, setRenamingTagId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  // Delete confirm
  const [dialog, setDialog] = useState<DialogState>(null)

  // Detail view (click a tag → show its contacts)
  const [detailTag, setDetailTag] = useState<DetailTag>(null)
  const [detailContacts, setDetailContacts] = useState<ContactRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailSearch, setDetailSearch] = useState("")
  const [removingContactId, setRemovingContactId] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  const loadTags = useCallback(() => {
    if (!clientId) { setAllTags([]); setLoading(false); return }
    setLoading(true)
    fetch(`/api/email/tags?client_id=${clientId}`)
      .then(r => r.json())
      .then(d => setAllTags(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [clientId])

  useEffect(() => { loadTags() }, [loadTags])

  // Load contacts when a tag is opened
  useEffect(() => {
    if (!detailTag) { setDetailContacts([]); setDetailSearch(""); return }
    setDetailLoading(true)
    setDetailContacts([])
    setDetailSearch("")
    fetch(`/api/email/tags/${detailTag.id}/contacts`)
      .then(r => r.json())
      .then(d => setDetailContacts(Array.isArray(d.contacts) ? d.contacts : []))
      .finally(() => setDetailLoading(false))
  }, [detailTag])

  const handleCreate = async () => {
    const name = newTagName.trim()
    if (!name || !clientId) return
    setCreating(true)
    try {
      const res = await fetch("/api/email/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, name }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(res.status === 409 ? "Tag already exists" : data.error); return }
      setAllTags(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewTagName("")
      inputRef.current?.focus()
      toast.success(`Tag "${name}" created`)
    } finally {
      setCreating(false)
    }
  }

  const handleRenameTag = async (tagId: string, newName: string) => {
    const name = newName.trim()
    if (!name) { setRenamingTagId(null); return }
    const res = await fetch(`/api/email/tags/${tagId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) { toast.error("Failed to rename tag"); return }
    setAllTags(prev => prev.map(t => t.id === tagId ? { ...t, name } : t))
    if (detailTag?.id === tagId) setDetailTag(d => d ? { ...d, name } : d)
    setRenamingTagId(null)
    toast.success("Tag renamed")
  }

  const handleDeleteTag = (tag: EmailTag) => {
    setDialog({
      title: `Delete tag "${tag.name}"?`,
      message: "This removes the tag from all contacts. Contacts themselves are not deleted.",
      onConfirm: async () => {
        setDialog(null)
        const res = await fetch(`/api/email/tags/${tag.id}`, { method: "DELETE" })
        if (!res.ok) { toast.error("Failed to delete tag"); return }
        setAllTags(prev => prev.filter(t => t.id !== tag.id))
        if (detailTag?.id === tag.id) setDetailTag(null)
        toast.success(`Tag "${tag.name}" deleted`)
      },
    })
  }

  const handleRemoveContactFromTag = async (contactId: string) => {
    if (!detailTag) return
    setRemovingContactId(contactId)
    try {
      const res = await fetch(`/api/email/tags/${detailTag.id}/contacts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: contactId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setDetailContacts(prev => prev.filter(c => c.id !== contactId))
      setAllTags(prev => prev.map(t =>
        t.id === detailTag.id ? { ...t, contact_count: Math.max(0, (t.contact_count ?? 1) - 1) } : t
      ))
      toast.success("Contact removed from tag")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove")
    } finally {
      setRemovingContactId(null)
    }
  }

  const toggleDetail = (tag: EmailTag) => {
    setDetailTag(d => d?.id === tag.id ? null : tag)
  }

  return (
    <div className="w-full space-y-5">
      {/* Confirm dialog */}
      {dialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setDialog(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="mt-0.5 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">{dialog.title}</h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{dialog.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDialog(null)} className="text-xs px-4 py-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50">Cancel</button>
              <button onClick={dialog.onConfirm} className="text-xs px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Tags</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Organise contacts into named groups. Tags are the targeting unit for newsletters and campaigns.</p>
      </div>

      {/* Create tag */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5">
        <label className="text-xs font-semibold text-zinc-500 block mb-2">Create new tag</label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
            placeholder="Tag name…"
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleCreate() }}
          />
          <button
            onClick={handleCreate}
            disabled={!newTagName.trim() || !clientId || creating}
            className="bg-[#003434] text-white text-sm px-5 py-2 rounded-lg hover:bg-[#004444] disabled:opacity-50 transition-colors shrink-0"
          >
            {creating ? "Creating…" : "Create tag"}
          </button>
        </div>
      </div>

      {/* Tags grid */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="w-5 h-5 border-2 border-[#003434]/20 border-t-[#003434] rounded-full animate-spin mx-auto" />
        </div>
      ) : allTags.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-500">No tags yet</p>
          <p className="text-xs text-zinc-400 mt-1">Create your first tag above to start grouping contacts.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allTags.map(tag => {
            const isOpen = detailTag?.id === tag.id
            return (
              <div
                key={tag.id}
                className={`bg-white border rounded-xl p-4 transition-all ${isOpen ? "border-[#003434] shadow-md col-span-full" : "border-zinc-200 hover:border-zinc-300"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {renamingTagId === tag.id ? (
                      <input
                        autoFocus
                        className="w-full border border-zinc-200 rounded-lg px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={async e => {
                          if (e.key === "Enter") await handleRenameTag(tag.id, renameValue)
                          if (e.key === "Escape") setRenamingTagId(null)
                        }}
                        onBlur={() => handleRenameTag(tag.id, renameValue)}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          className="text-sm font-semibold text-[#003434] hover:underline underline-offset-2 text-left truncate"
                          onClick={() => toggleDetail(tag)}
                        >
                          {tag.name}
                        </button>
                        <button
                          className="text-zinc-400 hover:text-[#003434] transition-colors shrink-0"
                          title="Rename"
                          onClick={() => { setRenamingTagId(tag.id); setRenameValue(tag.name) }}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    )}

                    <button
                      className="text-xs text-zinc-500 hover:text-[#003434] hover:underline underline-offset-2 transition-colors mt-1 block"
                      onClick={() => toggleDetail(tag)}
                    >
                      <span className="font-semibold text-zinc-700">{tag.contact_count ?? 0}</span>{" "}
                      contact{(tag.contact_count ?? 0) !== 1 ? "s" : ""}
                    </button>
                  </div>

                  <button
                    className="text-zinc-300 hover:text-red-400 transition-colors shrink-0 p-1 rounded hover:bg-red-50"
                    title="Delete tag"
                    onClick={() => handleDeleteTag(tag)}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Contact table expands inline when tag is open */}
                {isOpen && (
                  <ContactTable
                    tag={tag}
                    contacts={detailContacts}
                    loading={detailLoading}
                    search={detailSearch}
                    onSearchChange={setDetailSearch}
                    onRemove={handleRemoveContactFromTag}
                    removingId={removingContactId}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
