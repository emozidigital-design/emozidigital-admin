"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import toast from "react-hot-toast"
import { useClient } from "../client-context"

interface EmailTag { id: string; name: string; contact_count?: number }
interface EmailList {
  id: string; client_id: string; name: string; contact_count: number
  created_at: string; tags: EmailTag[]
}
interface ContactRow {
  id: string; first_name?: string; last_name?: string; email: string; phone?: string
}

const TAG_VISIBLE_LIMIT = 5

type DialogState = { title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void } | null
type DetailView = { kind: "list"; item: EmailList } | { kind: "tag"; item: EmailTag } | null

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

function TagPillDropdown({
  tag, onRename, onRemove, onClose,
}: {
  tag: EmailTag; onRename: (id: string, newName: string) => Promise<void>
  onRemove: () => Promise<void>; onClose: () => void
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
          <button className="w-full text-left px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 flex items-center gap-2"
            onClick={async () => { setBusy(true); await onRemove(); setBusy(false); onClose() }} disabled={busy}>
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

function AssignTagPopover({
  listId, listTags, allTags, onApply, onCreate, onClose,
}: {
  listId: string; listTags: EmailTag[]; allTags: EmailTag[]
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
  const apply = async () => { setBusy(true); await onApply(listId, Array.from(checked)); setBusy(false); onClose() }

  return (
    <div ref={ref} className={`absolute z-50 ${flipUp ? "bottom-full mb-1.5" : "top-full mt-1.5"} left-0 bg-white border border-zinc-200 rounded-xl shadow-xl w-52`} onClick={e => e.stopPropagation()}>
      <div className="p-2 border-b border-zinc-100">
        <input autoFocus className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Search or create tag…" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Escape") onClose() }} />
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
        <button onClick={apply} disabled={busy} className="w-full bg-[#003434] text-white text-xs py-1.5 rounded-lg hover:bg-[#004444] disabled:opacity-40 transition-colors">{busy ? "Saving…" : "Apply"}</button>
      </div>
    </div>
  )
}

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
        <div className="absolute z-[100] top-full mt-1 left-0 right-0 bg-white border border-zinc-200 rounded-xl shadow-xl py-1 max-h-44 overflow-y-auto">
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

// ─── Contact table shown when a list or tag is clicked ───────────────────────

function ContactTable({
  title, subtitle, contacts, loading, search, onSearchChange, onRemove, removingId,
  onRenameTag, tagId,
}: {
  title: string; subtitle: string
  contacts: ContactRow[]; loading: boolean
  search: string; onSearchChange: (v: string) => void
  onRemove: (contactId: string) => void; removingId: string | null
  onRenameTag?: () => void; tagId?: string
}) {
  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.toLowerCase()
    return !q || name.includes(q) || c.email.toLowerCase().includes(q) || (c.phone ?? "").includes(q)
  })

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>
            {onRenameTag && (
              <button onClick={onRenameTag} className="text-zinc-400 hover:text-[#003434] transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search contacts…"
            className="pl-8 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003434]/20 w-48"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="w-5 h-5 border-2 border-[#003434]/20 border-t-[#003434] rounded-full animate-spin mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-zinc-400">{search ? "No contacts match your search." : "No contacts in this segment yet."}</p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[40px_1fr_1fr_1fr_80px] gap-0 px-5 py-2 bg-zinc-50/80 border-b border-zinc-100">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">#</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Agent name</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Email address</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Phone number</span>
            <span />
          </div>
          <div className="divide-y divide-zinc-50">
            {filtered.map((c, idx) => (
              <div key={c.id} className={`grid grid-cols-[40px_1fr_1fr_1fr_80px] gap-0 px-5 py-3 items-center ${idx % 2 === 0 ? "bg-white" : "bg-zinc-50/40"} hover:bg-[#003434]/[0.03] transition-colors`}>
                <span className="text-xs text-zinc-400 tabular-nums">{idx + 1}</span>
                <span className="text-sm text-zinc-800 font-medium truncate pr-3">
                  {[c.first_name, c.last_name].filter(Boolean).join(" ") || <span className="text-zinc-400 font-normal italic">—</span>}
                </span>
                <span className="text-xs text-zinc-600 truncate pr-3">{c.email}</span>
                <span className="text-xs text-zinc-500 truncate pr-3">{c.phone || <span className="text-zinc-300">—</span>}</span>
                <div className="flex justify-end">
                  <button
                    onClick={() => onRemove(c.id)}
                    disabled={removingId === c.id}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    {removingId === c.id ? "…" : "Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-2.5 border-t border-zinc-100 bg-zinc-50/50">
            <p className="text-xs text-zinc-400">{filtered.length} of {contacts.length} contact{contacts.length !== 1 ? "s" : ""}</p>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ListsAndTagsPage() {
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
  const [activeTab, setActiveTab] = useState<"lists" | "tags">("lists")

  // Rename
  const [renamingList, setRenamingList] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  // Tag inline rename
  const [renamingTagId, setRenamingTagId] = useState<string | null>(null)
  const [renameTagValue, setRenameTagValue] = useState("")

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

  // Detail view (clicking a list or tag)
  const [detail, setDetail] = useState<DetailView>(null)
  const [detailContacts, setDetailContacts] = useState<ContactRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailSearch, setDetailSearch] = useState("")
  const [removingContactId, setRemovingContactId] = useState<string | null>(null)

  useEffect(() => { if (clientId) setForm(f => ({ ...f, client_id: clientId })) }, [clientId])

  const loadTags = useCallback(() => {
    if (!clientId) { setAllTags([]); return }
    fetch(`/api/email/tags?client_id=${clientId}`).then(r => r.json()).then(d => setAllTags(Array.isArray(d) ? d : []))
  }, [clientId])

  useEffect(() => { loadTags() }, [loadTags])

  const loadLists = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams(); if (clientId) p.set("client_id", clientId)
    fetch(`/api/email/lists?${p}`).then(r => r.json()).then(d => setLists(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }, [clientId])

  useEffect(() => { loadLists() }, [loadLists])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) setShowOverflow(false)
      if (createTagRef.current && !createTagRef.current.contains(e.target as Node)) { setShowCreateTag(false); setNewGlobalTag("") }
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  // Load contacts when detail changes
  useEffect(() => {
    if (!detail) { setDetailContacts([]); setDetailSearch(""); return }
    setDetailLoading(true)
    setDetailContacts([])
    setDetailSearch("")
    const url = detail.kind === "list"
      ? `/api/email/lists/${detail.item.id}/contacts`
      : `/api/email/tags/${detail.item.id}/contacts`
    fetch(url)
      .then(r => r.json())
      .then(d => setDetailContacts(Array.isArray(d.contacts) ? d.contacts : []))
      .finally(() => setDetailLoading(false))
  }, [detail])

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

  const handleDeleteList = (id: string, name: string) => {
    setDialog({
      title: "Delete list?",
      message: `Remove "${name}" and all its contacts from the list permanently.`,
      onConfirm: async () => {
        setDialog(null)
        const res = await fetch(`/api/email/lists/${id}`, { method: "DELETE" })
        if (!res.ok) { toast.error("Failed to delete"); return }
        setLists(prev => prev.filter(l => l.id !== id))
        if (detail?.kind === "list" && detail.item.id === id) setDetail(null)
        toast.success("List deleted")
      }
    })
  }

  const handleRenameList = async (listId: string) => {
    const trimmed = renameValue.trim()
    if (!trimmed) { setRenamingList(null); return }
    const res = await fetch(`/api/email/lists/${listId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmed }) })
    if (!res.ok) { toast.error("Failed to rename list"); return }
    setLists(prev => prev.map(l => l.id === listId ? { ...l, name: trimmed } : l))
    if (detail?.kind === "list" && detail.item.id === listId) setDetail({ kind: "list", item: { ...detail.item, name: trimmed } })
    setRenamingList(null); toast.success("List renamed")
  }

  const handleRenameTag = async (tagId: string, newName: string) => {
    const res = await fetch(`/api/email/tags/${tagId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName }) })
    if (!res.ok) { toast.error("Failed to rename tag"); return }
    setAllTags(prev => prev.map(t => t.id === tagId ? { ...t, name: newName } : t))
    setLists(prev => prev.map(l => ({ ...l, tags: l.tags.map(t => t.id === tagId ? { ...t, name: newName } : t) })))
    if (detail?.kind === "tag" && detail.item.id === tagId) setDetail({ kind: "tag", item: { ...detail.item, name: newName } })
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

  const handleRemoveContactFromDetail = async (contactId: string) => {
    if (!detail) return
    setRemovingContactId(contactId)
    try {
      const url = detail.kind === "list"
        ? `/api/email/lists/${detail.item.id}/contacts`
        : `/api/email/tags/${detail.item.id}/contacts`
      const res = await fetch(url, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact_id: contactId }) })
      if (!res.ok) throw new Error((await res.json()).error)
      setDetailContacts(prev => prev.filter(c => c.id !== contactId))
      if (detail.kind === "list") {
        setLists(prev => prev.map(l => l.id === detail.item.id ? { ...l, contact_count: Math.max(0, l.contact_count - 1) } : l))
      } else {
        setAllTags(prev => prev.map(t => t.id === detail.item.id ? { ...t, contact_count: Math.max(0, (t.contact_count ?? 1) - 1) } : t))
      }
      toast.success("Contact removed")
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to remove") }
    finally { setRemovingContactId(null) }
  }

  const openListDetail = (l: EmailList) => {
    setDetail(d => d?.kind === "list" && d.item.id === l.id ? null : { kind: "list", item: l })
  }

  const openTagDetail = (t: EmailTag) => {
    setDetail(d => d?.kind === "tag" && d.item.id === t.id ? null : { kind: "tag", item: t })
  }

  return (
    <div className="w-full space-y-5">
      {dialog && <ConfirmDialog {...dialog} onCancel={() => setDialog(null)} />}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Lists &amp; Tags</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Named contact segments and tag groups per client</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-zinc-100 rounded-xl p-1 w-fit gap-1">
        <button
          onClick={() => { setActiveTab("lists"); setDetail(null) }}
          className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === "lists" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
        >
          Lists
          <span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full ${activeTab === "lists" ? "bg-[#003434]/10 text-[#003434]" : "bg-zinc-200 text-zinc-500"}`}>{lists.length}</span>
        </button>
        <button
          onClick={() => { setActiveTab("tags"); setDetail(null) }}
          className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === "tags" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
        >
          Tags
          <span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full ${activeTab === "tags" ? "bg-[#003434]/10 text-[#003434]" : "bg-zinc-200 text-zinc-500"}`}>{allTags.length}</span>
        </button>
      </div>

      {/* ── LISTS TAB ── */}
      {activeTab === "lists" && (
        <div className="space-y-4">
          {/* Create list form */}
          <form onSubmit={handleAdd} className="bg-white border border-zinc-200 rounded-xl p-5 space-y-3">
            <p className="text-sm font-semibold text-zinc-700">Create list</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Client ID" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} required />
              <input className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="List name (e.g. Newsletter Q1)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <TagMultiSelect allTags={allTags} value={form.tagIds} onChange={v => setForm(f => ({ ...f, tagIds: v }))} />
            <button type="submit" disabled={adding} className="bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] disabled:opacity-50 transition-colors">{adding ? "Creating…" : "Create list"}</button>
          </form>

          {/* Filter bar */}
          <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mr-1 shrink-0">Filter</span>
            <button onClick={() => setFilterTag(null)} className={`inline-flex items-center text-xs px-3 py-1 rounded-full border transition-colors shrink-0 ${filterTag === null ? "bg-[#003434] text-white border-[#003434]" : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"}`}>
              All {filterTag === null && <span className="ml-1.5 opacity-60 text-[10px]">{lists.length}</span>}
            </button>
            {visibleTags.map(tag => {
              const count = lists.filter(l => l.tags.some(t => t.id === tag.id)).length
              return (
                <button key={tag.id} onClick={() => setFilterTag(filterTag === tag.id ? null : tag.id)} className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-colors shrink-0 ${filterTag === tag.id ? "bg-[#003434] text-white border-[#003434]" : "bg-teal-50 text-[#003434] border-teal-200 hover:bg-teal-100"}`}>
                  {tag.name}<span className={`text-[10px] ${filterTag === tag.id ? "opacity-60" : "text-teal-600/70"}`}>{count}</span>
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
                      {renamingList === l.id ? (
                        <div className="flex items-center gap-2 mb-1">
                          <input autoFocus className="border border-zinc-200 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 flex-1 max-w-xs" value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleRenameList(l.id); if (e.key === "Escape") setRenamingList(null) }} onBlur={() => handleRenameList(l.id)} />
                          <button className="text-xs text-zinc-400 hover:text-zinc-600" onMouseDown={e => { e.preventDefault(); setRenamingList(null) }}>Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <button className="text-sm font-semibold text-[#003434] hover:underline underline-offset-2 text-left" onClick={() => openListDetail(l)}>{l.name}</button>
                          <button className="text-[11px] text-zinc-400 hover:text-[#003434] transition-colors" onClick={() => { setRenamingList(l.id); setRenameValue(l.name) }}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          {l.tags.map(tag => (
                            <span key={tag.id} className="relative inline-flex">
                              <button
                                className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border transition-colors ${filterTag === tag.id ? "bg-[#003434] text-white border-[#003434]" : "bg-teal-50 text-[#003434] border-teal-200 hover:bg-teal-100"}`}
                                onClick={() => setOpenPillDropdown(openPillDropdown?.listId === l.id && openPillDropdown.tag.id === tag.id ? null : { listId: l.id, tag })}
                              >
                                {tag.name}
                                <svg className="w-2 h-2 ml-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                              </button>
                              {openPillDropdown?.listId === l.id && openPillDropdown.tag.id === tag.id && (
                                <TagPillDropdown tag={tag} onRename={handleRenameTag} onRemove={() => handleRemoveTagFromList(l.id, tag.id)} onClose={() => setOpenPillDropdown(null)} />
                              )}
                            </span>
                          ))}
                          <span className="relative">
                            <button className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-dashed border-zinc-300 text-zinc-400 hover:border-teal-300 hover:text-[#003434] transition-colors" onClick={() => setOpenAssignTag(openAssignTag === l.id ? null : l.id)}>
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                              {l.tags.length > 0 ? "tags" : "tag"}
                            </button>
                            {openAssignTag === l.id && (
                              <AssignTagPopover listId={l.id} listTags={l.tags} allTags={allTags} onApply={handleAssignTagsToList} onCreate={handleCreateAndAssignToList} onClose={() => setOpenAssignTag(null)} />
                            )}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-zinc-400">
                        <button className="font-medium text-zinc-500 hover:text-[#003434] transition-colors hover:underline underline-offset-2" onClick={() => openListDetail(l)}>
                          {l.contact_count} contact{l.contact_count !== 1 ? "s" : ""}
                        </button>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 pt-0.5">
                      <p className="text-xs text-zinc-400">{new Date(l.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                      <button onClick={() => { setExpandedList(expandedList === l.id ? null : l.id); setAddEmail("") }} className="text-xs text-[#003434] hover:text-[#004444] underline underline-offset-2">
                        {expandedList === l.id ? "Close" : "Add contacts"}
                      </button>
                      <button onClick={() => handleDeleteList(l.id, l.name)} className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2">Delete</button>
                    </div>
                  </div>

                  {expandedList === l.id && (
                    <div className="border-t border-zinc-100 px-4 py-3.5 bg-zinc-50/60 space-y-2.5">
                      {l.tags.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                          <svg className="w-3.5 h-3.5 text-teal-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                          Contacts added here will be auto-tagged{" "}
                          {l.tags.map((t, i) => (<span key={t.id}><strong>{t.name}</strong>{i < l.tags.length - 1 ? ", " : ""}</span>))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input className="flex-1 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white" placeholder="contact@email.com" type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddContact(l.id)} />
                        <button onClick={() => handleAddContact(l.id)} disabled={addingContact} className="bg-[#003434] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-[#004444] disabled:opacity-50 transition-colors">{addingContact ? "Adding…" : "Add"}</button>
                      </div>
                      <button onClick={() => handleImportAll(l.id)} disabled={importingAll === l.id} className="w-full text-xs border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
                        {importingAll === l.id ? "Importing…" : "Import all contacts for this client"}
                      </button>
                    </div>
                  )}

                  {/* Inline contact table for this list */}
                  {detail?.kind === "list" && detail.item.id === l.id && (
                    <div className="border-t border-zinc-200 p-4">
                      <ContactTable
                        title={l.name}
                        subtitle={`${detailContacts.length} contact${detailContacts.length !== 1 ? "s" : ""} in this list`}
                        contacts={detailContacts}
                        loading={detailLoading}
                        search={detailSearch}
                        onSearchChange={setDetailSearch}
                        onRemove={handleRemoveContactFromDetail}
                        removingId={removingContactId}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAGS TAB ── */}
      {activeTab === "tags" && (
        <div className="space-y-4">
          {/* Create tag */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-zinc-500 block mb-1.5">Create new tag</label>
              <div ref={createTagRef} className="flex gap-2">
                <input
                  className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
                  placeholder="Tag name…"
                  value={newGlobalTag}
                  onChange={e => setNewGlobalTag(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleCreateGlobalTag() }}
                />
                <button onClick={handleCreateGlobalTag} disabled={!newGlobalTag.trim() || !clientId} className="bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] disabled:opacity-50 transition-colors shrink-0">
                  Create tag
                </button>
              </div>
            </div>
          </div>

          {/* Tags grid */}
          {allTags.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-zinc-400">No tags yet. Create one above.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allTags.map(tag => (
                <div key={tag.id} className={`bg-white border rounded-xl p-4 space-y-3 transition-all ${detail?.kind === "tag" && detail.item.id === tag.id ? "border-[#003434] shadow-md" : "border-zinc-200 hover:border-zinc-300"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {renamingTagId === tag.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            className="flex-1 min-w-0 border border-zinc-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
                            value={renameTagValue}
                            onChange={e => setRenameTagValue(e.target.value)}
                            onKeyDown={async e => {
                              if (e.key === "Enter") { await handleRenameTag(tag.id, renameTagValue); setRenamingTagId(null) }
                              if (e.key === "Escape") setRenamingTagId(null)
                            }}
                            onBlur={async () => { await handleRenameTag(tag.id, renameTagValue); setRenamingTagId(null) }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            className="text-sm font-semibold text-[#003434] hover:underline underline-offset-2 text-left truncate"
                            onClick={() => openTagDetail(tag)}
                          >
                            {tag.name}
                          </button>
                          <button
                            className="text-zinc-400 hover:text-[#003434] transition-colors shrink-0"
                            onClick={() => { setRenamingTagId(tag.id); setRenameTagValue(tag.name) }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    className="text-xs text-zinc-500 hover:text-[#003434] hover:underline underline-offset-2 transition-colors"
                    onClick={() => openTagDetail(tag)}
                  >
                    <span className="font-semibold text-zinc-700">{tag.contact_count ?? 0}</span> contact{(tag.contact_count ?? 0) !== 1 ? "s" : ""}
                  </button>

                  {/* Inline contact table for this tag */}
                  {detail?.kind === "tag" && detail.item.id === tag.id && (
                    <div className="border-t border-zinc-100 pt-3">
                      <ContactTable
                        title={tag.name}
                        subtitle={`${detailContacts.length} contact${detailContacts.length !== 1 ? "s" : ""} with this tag`}
                        contacts={detailContacts}
                        loading={detailLoading}
                        search={detailSearch}
                        onSearchChange={setDetailSearch}
                        onRemove={handleRemoveContactFromDetail}
                        removingId={removingContactId}
                        onRenameTag={() => { setRenamingTagId(tag.id); setRenameTagValue(tag.name) }}
                        tagId={tag.id}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
