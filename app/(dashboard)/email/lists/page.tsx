"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import toast from "react-hot-toast"
import { useClient } from "../client-context"

interface EmailTag { id: string; name: string }
interface EmailList {
  id: string; client_id: string; name: string; contact_count: number
  created_at: string; tags: EmailTag[]
}

const TAG_VISIBLE_LIMIT = 5

type DialogState = { title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void } | null

function useFlipUp(ref: React.RefObject<HTMLDivElement>) {
  const [flipUp, setFlipUp] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    if (rect.bottom > window.innerHeight - 8) setFlipUp(true)
  })
  return flipUp
}

function ConfirmDialog({ title, message, confirmLabel = "Delete", danger = true, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel?: string; danger?: boolean
  onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${danger ? "bg-red-100" : "bg-zinc-100"}`}>
            <svg className={`w-4 h-4 ${danger ? "text-red-500" : "text-zinc-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="text-xs px-4 py-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} className={`text-xs px-4 py-2 rounded-lg text-white transition-colors ${danger ? "bg-red-500 hover:bg-red-600" : "bg-[#003434] hover:bg-[#004444]"}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

// Tag pill dropdown — Rename / Remove from list only (no global delete)
function TagPillDropdown({
  tag,
  onRename,
  onRemove,
  onClose,
}: {
  tag: EmailTag
  onRename: (id: string, newName: string) => Promise<void>
  onRemove: () => Promise<void>
  onClose: () => void
}) {
  const [mode, setMode] = useState<"menu" | "rename">("menu")
  const [val, setVal] = useState(tag.name)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const flipUp = useFlipUp(ref)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [onClose])

  const submit = async () => {
    const t = val.trim()
    if (!t || t === tag.name) { onClose(); return }
    setBusy(true); await onRename(tag.id, t); setBusy(false); onClose()
  }

  return (
    <div ref={ref} className={`absolute z-50 ${flipUp ? "bottom-full mb-1" : "top-full mt-1"} left-0 bg-white border border-zinc-200 rounded-xl shadow-xl py-1.5 min-w-[156px]`} onClick={e => e.stopPropagation()}>
      {mode === "menu" ? (
        <>
          <button className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2" onClick={() => setMode("rename")}>
            <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Rename tag
          </button>
          <div className="my-1 border-t border-zinc-100" />
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 flex items-center gap-2"
            onClick={async () => { setBusy(true); await onRemove(); setBusy(false); onClose() }}
            disabled={busy}
          >
            <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            Remove from list
          </button>
        </>
      ) : (
        <div className="px-2 py-1.5 flex gap-1.5">
          <input autoFocus className="flex-1 min-w-0 border border-zinc-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#003434]/20 w-20" value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose() }} />
          <button className="text-xs bg-[#003434] text-white px-2.5 py-1 rounded-lg hover:bg-[#004444] disabled:opacity-50" onClick={submit} disabled={busy}>{busy ? "…" : "Save"}</button>
        </div>
      )}
    </div>
  )
}

// Multi-select assign-tag popover for lists
function AssignTagPopover({
  listId,
  listTags,
  allTags,
  onApply,
  onCreate,
  onClose,
}: {
  listId: string
  listTags: EmailTag[]
  allTags: EmailTag[]
  onApply: (listId: string, tagIds: string[]) => Promise<void>
  onCreate: (listId: string, name: string) => Promise<void>
  onClose: () => void
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set(listTags.map(t => t.id)))
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const flipUp = useFlipUp(ref)
  const filtered = input.trim() ? allTags.filter(t => t.name.toLowerCase().includes(input.toLowerCase())) : allTags

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [onClose])

  const toggle = (id: string) => setChecked(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const apply = async () => {
    setBusy(true); await onApply(listId, Array.from(checked)); setBusy(false); onClose()
  }

  return (
    <div ref={ref} className={`absolute z-50 ${flipUp ? "bottom-full mb-1.5" : "top-full mt-1.5"} left-0 bg-white border border-zinc-200 rounded-xl shadow-xl w-52`} onClick={e => e.stopPropagation()}>
      <div className="p-2 border-b border-zinc-100">
        <input autoFocus className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Search or create tag…" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Escape") onClose() }}
        />
      </div>
      {filtered.length > 0 && (
        <div className="py-1 max-h-40 overflow-y-auto">
          {filtered.map(t => (
            <label key={t.id} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-50 cursor-pointer">
              <input type="checkbox" checked={checked.has(t.id)} onChange={() => toggle(t.id)} className="w-3.5 h-3.5 rounded border-zinc-300 accent-[#003434] cursor-pointer" />
              <span className="text-xs text-zinc-700">{t.name}</span>
            </label>
          ))}
        </div>
      )}
      {input.trim() && !allTags.find(t => t.name.toLowerCase() === input.toLowerCase()) && (
        <div className="border-t border-zinc-100">
          <button className="w-full text-left px-3 py-2 text-xs text-[#003434] hover:bg-teal-50 flex items-center gap-2 font-medium"
            onClick={async () => { setBusy(true); await onCreate(listId, input.trim()); setBusy(false); onClose() }} disabled={busy}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Create &ldquo;{input.trim()}&rdquo;
          </button>
        </div>
      )}
      <div className="border-t border-zinc-100 p-2">
        <button onClick={apply} disabled={busy} className="w-full bg-[#003434] text-white text-xs py-1.5 rounded-lg hover:bg-[#004444] disabled:opacity-40 transition-colors">
          {busy ? "Saving…" : "Apply"}
        </button>
      </div>
    </div>
  )
}

// Multi-select dropdown for tag pickers inside forms
function TagMultiSelect({ allTags, value, onChange, placeholder = "Assign tags (optional)" }: {
  allTags: EmailTag[]; value: string[]; onChange: (ids: string[]) => void; placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
  if (allTags.length === 0) return null
  const label = value.length === 0 ? placeholder : value.length === 1 ? (allTags.find(t => t.id === value[0])?.name ?? placeholder) : `${value.length} tags selected`
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white">
        <span className={value.length === 0 ? "text-zinc-400" : "text-zinc-700"}>{label}</span>
        <svg className={`w-4 h-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-zinc-200 rounded-xl shadow-xl py-1 max-h-44 overflow-y-auto">
          {allTags.map(tag => (
            <label key={tag.id} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-50 cursor-pointer">
              <input type="checkbox" checked={value.includes(tag.id)} onChange={() => toggle(tag.id)} className="w-3.5 h-3.5 rounded border-zinc-300 accent-[#003434] cursor-pointer" />
              <span className="text-xs text-zinc-700">{tag.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ListsPage() {
  const { clientId } = useClient()
  const [lists, setLists] = useState<EmailList[]>([])
  const [allTags, setAllTags] = useState<EmailTag[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ client_id: "", name: "", tagIds: [] as string[] })
  const [adding, setAdding] = useState(false)
  const [expandedList, setExpandedList] = useState<string | null>(null)
  const [addEmail, setAddEmail] = useState("")
  const [addingContact, setAddingContact] = useState(false)
  const [importingAll, setImportingAll] = useState<string | null>(null)

  // Rename
  const [renamingList, setRenamingList] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  // Confirm dialog
  const [dialog, setDialog] = useState<DialogState>(null)

  // Tag UI
  const [openPillDropdown, setOpenPillDropdown] = useState<{ listId: string; tag: EmailTag } | null>(null)
  const [openAssignTag, setOpenAssignTag] = useState<string | null>(null)

  // Filter bar
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [showOverflow, setShowOverflow] = useState(false)
  const [showCreateTag, setShowCreateTag] = useState(false)
  const [newGlobalTag, setNewGlobalTag] = useState("")
  const overflowRef = useRef<HTMLDivElement>(null)
  const createTagRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (clientId) setForm(f => ({ ...f, client_id: clientId })) }, [clientId])

  const loadTags = useCallback(() => {
    if (!clientId) { setAllTags([]); return }
    fetch(`/api/email/tags?client_id=${clientId}`).then(r => r.json()).then(d => setAllTags(Array.isArray(d) ? d : []))
  }, [clientId])

  useEffect(() => { loadTags() }, [loadTags])

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams(); if (clientId) p.set("client_id", clientId)
    fetch(`/api/email/lists?${p}`).then(r => r.json()).then(d => setLists(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }, [clientId])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) setShowOverflow(false)
      if (createTagRef.current && !createTagRef.current.contains(e.target as Node)) { setShowCreateTag(false); setNewGlobalTag("") }
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const visibleLists = filterTag ? lists.filter(l => l.tags.some(t => t.id === filterTag)) : lists
  const visibleTags = allTags.slice(0, TAG_VISIBLE_LIMIT)
  const overflowTags = allTags.slice(TAG_VISIBLE_LIMIT)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setAdding(true)
    try {
      const res = await fetch("/api/email/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: form.client_id, name: form.name, tag_ids: form.tagIds }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLists(prev => [data, ...prev]); setForm({ client_id: clientId, name: "", tagIds: [] }); toast.success("List created")
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Error") }
    finally { setAdding(false) }
  }

  const handleAddContact = async (listId: string) => {
    if (!addEmail) return; setAddingContact(true)
    try {
      const res = await fetch(`/api/email/lists/${listId}/contacts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: addEmail }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Contact added to list"); setAddEmail("")
      setLists(prev => prev.map(l => l.id === listId ? { ...l, contact_count: l.contact_count + 1 } : l))
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Error") }
    finally { setAddingContact(false) }
  }

  const handleImportAll = async (listId: string) => {
    setImportingAll(listId)
    try {
      const res = await fetch(`/api/email/lists/${listId}/contacts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Imported ${data.imported} contacts`)
      setLists(prev => prev.map(l => l.id === listId ? { ...l, contact_count: data.imported } : l))
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Error") }
    finally { setImportingAll(null) }
  }

  const handleDelete = (id: string, name: string) => {
    setDialog({
      title: "Delete list?",
      message: `Remove "${name}" and all its contacts from the list permanently.`,
      onConfirm: async () => {
        setDialog(null)
        const res = await fetch(`/api/email/lists/${id}`, { method: "DELETE" })
        if (!res.ok) { toast.error("Failed to delete"); return }
        setLists(prev => prev.filter(l => l.id !== id)); toast.success("List deleted")
      }
    })
  }

  const handleRenameList = async (listId: string) => {
    const trimmed = renameValue.trim()
    if (!trimmed) { setRenamingList(null); return }
    const res = await fetch(`/api/email/lists/${listId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmed }) })
    if (!res.ok) { toast.error("Failed to rename list"); return }
    setLists(prev => prev.map(l => l.id === listId ? { ...l, name: trimmed } : l)); setRenamingList(null); toast.success("List renamed")
  }

  const handleRenameTag = async (tagId: string, newName: string) => {
    const res = await fetch(`/api/email/tags/${tagId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName }) })
    if (!res.ok) { toast.error("Failed to rename tag"); return }
    setAllTags(prev => prev.map(t => t.id === tagId ? { ...t, name: newName } : t))
    setLists(prev => prev.map(l => ({ ...l, tags: l.tags.map(t => t.id === tagId ? { ...t, name: newName } : t) })))
    toast.success("Tag renamed")
  }

  const handleAssignTagsToList = async (listId: string, tagIds: string[]) => {
    const res = await fetch(`/api/email/lists/${listId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tag_ids: tagIds }) })
    const data = await res.json()
    if (!res.ok) { toast.error("Failed to update tags"); return }
    setLists(prev => prev.map(l => l.id === listId ? { ...l, tags: data.tags ?? [] } : l))
    toast.success("Tags updated")
  }

  const handleCreateAndAssignToList = async (listId: string, name: string) => {
    const res = await fetch("/api/email/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: clientId, name }) })
    const data = await res.json()
    if (!res.ok) {
      if (res.status === 409) {
        const ex = allTags.find(t => t.name.toLowerCase() === name.toLowerCase())
        if (ex) {
          const list = lists.find(l => l.id === listId)
          const currentTagIds = list?.tags.map(t => t.id) ?? []
          if (!currentTagIds.includes(ex.id)) await handleAssignTagsToList(listId, [...currentTagIds, ex.id])
          return
        }
      }
      toast.error(data.error); return
    }
    setAllTags(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    const list = lists.find(l => l.id === listId)
    const currentTagIds = list?.tags.map(t => t.id) ?? []
    await handleAssignTagsToList(listId, [...currentTagIds, data.id])
  }

  const handleRemoveTagFromList = async (listId: string, tagId: string) => {
    const list = lists.find(l => l.id === listId)
    if (!list) return
    const newTagIds = list.tags.filter(t => t.id !== tagId).map(t => t.id)
    await handleAssignTagsToList(listId, newTagIds)
  }

  const handleCreateGlobalTag = async () => {
    const name = newGlobalTag.trim()
    if (!name || !clientId) return
    const res = await fetch("/api/email/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: clientId, name }) })
    const data = await res.json()
    if (!res.ok) { toast.error(res.status === 409 ? "Tag already exists" : data.error); return }
    setAllTags(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setNewGlobalTag(""); setShowCreateTag(false); toast.success(`Tag "${name}" created`)
  }

  return (
    <div className="max-w-3xl">
      {dialog && <ConfirmDialog {...dialog} onCancel={() => setDialog(null)} />}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Lists</h1>
        <p className="text-sm text-zinc-500 mt-1">Named contact segments per client</p>
      </div>

      {/* Create list form */}
      <form onSubmit={handleAdd} className="bg-white border border-zinc-200 rounded-xl p-5 mb-5 space-y-3">
        <p className="text-sm font-semibold text-zinc-700">Create list</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Client ID" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} required />
          <input className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="List name (e.g. Newsletter Q1)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        </div>
        <TagMultiSelect allTags={allTags} value={form.tagIds} onChange={v => setForm(f => ({ ...f, tagIds: v }))} />
        <button type="submit" disabled={adding} className="bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] disabled:opacity-50 transition-colors">{adding ? "Creating…" : "Create list"}</button>
      </form>

      {/* ── Tag filter bar ── */}
      <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 mb-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mr-1 shrink-0">Filter</span>

        <button
          onClick={() => setFilterTag(null)}
          className={`inline-flex items-center text-xs px-3 py-1 rounded-full border transition-colors shrink-0 ${filterTag === null ? "bg-[#003434] text-white border-[#003434]" : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"}`}
        >
          All
          {filterTag === null && <span className="ml-1.5 opacity-60 text-[10px]">{lists.length}</span>}
        </button>

        {visibleTags.map(tag => {
          const count = lists.filter(l => l.tags.some(t => t.id === tag.id)).length
          return (
            <button
              key={tag.id}
              onClick={() => setFilterTag(filterTag === tag.id ? null : tag.id)}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-colors shrink-0 ${filterTag === tag.id ? "bg-[#003434] text-white border-[#003434]" : "bg-teal-50 text-[#003434] border-teal-200 hover:bg-teal-100"}`}
            >
              {tag.name}
              <span className={`text-[10px] ${filterTag === tag.id ? "opacity-60" : "text-teal-600/70"}`}>{count}</span>
            </button>
          )
        })}

        {overflowTags.length > 0 && (
          <div className="relative shrink-0" ref={overflowRef}>
            <button onClick={() => setShowOverflow(v => !v)} className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full border transition-colors ${showOverflow ? "bg-zinc-100 border-zinc-300 text-zinc-700" : "bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50"}`}>
              +{overflowTags.length} more
              <svg className={`w-3 h-3 transition-transform ${showOverflow ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showOverflow && (
              <div className="absolute z-50 top-full left-0 mt-1.5 bg-white border border-zinc-200 rounded-xl shadow-xl py-1.5 min-w-[160px]">
                {overflowTags.map(tag => {
                  const count = lists.filter(l => l.tags.some(t => t.id === tag.id)).length
                  return (
                    <button key={tag.id} onClick={() => { setFilterTag(filterTag === tag.id ? null : tag.id); setShowOverflow(false) }} className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-zinc-50 ${filterTag === tag.id ? "text-[#003434] font-medium" : "text-zinc-700"}`}>
                      <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-teal-400" />{tag.name}</span>
                      <span className="text-[10px] text-zinc-400">{count}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {allTags.length > 0 && <span className="w-px h-4 bg-zinc-200 shrink-0" />}

        <div className="relative shrink-0" ref={createTagRef}>
          <button onClick={() => { setShowCreateTag(v => !v); setNewGlobalTag("") }} className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border border-dashed border-zinc-300 text-zinc-500 hover:border-[#003434] hover:text-[#003434] transition-colors">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New tag
          </button>
          {showCreateTag && (
            <div className="absolute z-50 top-full left-0 mt-1.5 bg-white border border-zinc-200 rounded-xl shadow-xl p-2 w-52" onClick={e => e.stopPropagation()}>
              <div className="flex gap-1.5">
                <input autoFocus className="flex-1 min-w-0 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Tag name…" value={newGlobalTag} onChange={e => setNewGlobalTag(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleCreateGlobalTag(); if (e.key === "Escape") { setShowCreateTag(false); setNewGlobalTag("") } }} />
                <button className="text-xs bg-[#003434] text-white px-2.5 py-1 rounded-lg hover:bg-[#004444] shrink-0" onClick={handleCreateGlobalTag}>Create</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lists */}
      {loading ? (
        <div className="py-10 text-center"><div className="inline-block w-5 h-5 border-2 border-zinc-200 border-t-[#003434] rounded-full animate-spin" /></div>
      ) : visibleLists.length === 0 ? (
        <div className="py-10 text-center"><p className="text-sm text-zinc-400">{filterTag ? `No lists tagged "${allTags.find(t => t.id === filterTag)?.name}".` : "No lists yet."}</p></div>
      ) : (
        <div className="space-y-2">
          {visibleLists.map(l => (
            <div key={l.id} className="bg-white border border-zinc-200 rounded-xl overflow-visible">
              <div className="px-4 py-3.5 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Name row */}
                  {renamingList === l.id ? (
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        autoFocus
                        className="border border-zinc-200 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 flex-1 max-w-xs"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleRenameList(l.id); if (e.key === "Escape") setRenamingList(null) }}
                        onBlur={() => handleRenameList(l.id)}
                      />
                      <button className="text-xs text-zinc-400 hover:text-zinc-600" onMouseDown={e => { e.preventDefault(); setRenamingList(null) }}>Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-zinc-800">{l.name}</p>
                      <button
                        className="text-[11px] text-zinc-400 hover:text-[#003434] transition-colors"
                        onClick={() => { setRenamingList(l.id); setRenameValue(l.name) }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>

                      {/* Tag pills */}
                      {l.tags.map(tag => (
                        <span key={tag.id} className="relative inline-flex">
                          <button
                            className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border transition-colors ${filterTag === tag.id ? "bg-[#003434] text-white border-[#003434]" : "bg-teal-50 text-[#003434] border-teal-200 hover:bg-teal-100"}`}
                            onClick={() => setOpenPillDropdown(
                              openPillDropdown?.listId === l.id && openPillDropdown.tag.id === tag.id ? null : { listId: l.id, tag }
                            )}
                          >
                            {tag.name}
                            <svg className="w-2 h-2 ml-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          {openPillDropdown?.listId === l.id && openPillDropdown.tag.id === tag.id && (
                            <TagPillDropdown
                              tag={tag}
                              onRename={handleRenameTag}
                              onRemove={() => handleRemoveTagFromList(l.id, tag.id)}
                              onClose={() => setOpenPillDropdown(null)}
                            />
                          )}
                        </span>
                      ))}

                      {/* Assign tags button */}
                      <span className="relative">
                        <button
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-dashed border-zinc-300 text-zinc-400 hover:border-teal-300 hover:text-[#003434] transition-colors"
                          onClick={() => setOpenAssignTag(openAssignTag === l.id ? null : l.id)}
                        >
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                          {l.tags.length > 0 ? "tags" : "tag"}
                        </button>
                        {openAssignTag === l.id && (
                          <AssignTagPopover
                            listId={l.id}
                            listTags={l.tags}
                            allTags={allTags}
                            onApply={handleAssignTagsToList}
                            onCreate={handleCreateAndAssignToList}
                            onClose={() => setOpenAssignTag(null)}
                          />
                        )}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-zinc-400">
                    <span className="font-medium text-zinc-500">{l.contact_count}</span> contact{l.contact_count !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 pt-0.5">
                  <p className="text-xs text-zinc-400">{new Date(l.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  <button onClick={() => { setExpandedList(expandedList === l.id ? null : l.id); setAddEmail("") }} className="text-xs text-[#003434] hover:text-[#004444] underline underline-offset-2">
                    {expandedList === l.id ? "Close" : "Add contacts"}
                  </button>
                  <button onClick={() => handleDelete(l.id, l.name)} className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2">Delete</button>
                </div>
              </div>

              {expandedList === l.id && (
                <div className="border-t border-zinc-100 px-4 py-3.5 bg-zinc-50/60 space-y-2.5">
                  {l.tags.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                      <svg className="w-3.5 h-3.5 text-teal-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                      Contacts added here will be auto-tagged{" "}
                      {l.tags.map((t, i) => (
                        <span key={t.id}><strong>{t.name}</strong>{i < l.tags.length - 1 ? ", " : ""}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      className="flex-1 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white"
                      placeholder="contact@email.com"
                      type="email"
                      value={addEmail}
                      onChange={e => setAddEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleAddContact(l.id)}
                    />
                    <button onClick={() => handleAddContact(l.id)} disabled={addingContact} className="bg-[#003434] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-[#004444] disabled:opacity-50 transition-colors">
                      {addingContact ? "Adding…" : "Add"}
                    </button>
                  </div>
                  <button onClick={() => handleImportAll(l.id)} disabled={importingAll === l.id} className="w-full text-xs border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
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
