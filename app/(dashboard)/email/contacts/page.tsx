"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import toast from "react-hot-toast"
import { useClient } from "../client-context"

interface EmailTag { id: string; name: string }
interface Contact {
  id: string; client_id: string; email: string; name: string | null
  subscribed: boolean; bounced: boolean; complained: boolean
  created_at: string; tags: EmailTag[]
}
interface EmailList { id: string; name: string }

type DialogState = {
  title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void
} | null

const TAG_VISIBLE_LIMIT = 5

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-zinc-100">
        <div className="flex items-start gap-3 mb-5">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${danger ? "bg-red-100" : "bg-amber-100"}`}>
            <svg className={`w-4 h-4 ${danger ? "text-red-600" : "text-amber-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="text-sm px-4 py-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors" onClick={onCancel}>Cancel</button>
          <button className={`text-sm px-4 py-2 rounded-lg text-white transition-colors ${danger ? "bg-red-500 hover:bg-red-600" : "bg-amber-500 hover:bg-amber-600"}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

// Central tag management — the ONLY place for permanent deletion
function TagsManager({ allTags, contacts, onRename, onDelete, onCreateTag, open, onToggle }: {
  allTags: EmailTag[]; contacts: Contact[]
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => void
  onCreateTag: (name: string) => Promise<void>
  open: boolean; onToggle: () => void
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState("")
  const [renameBusy, setRenameBusy] = useState(false)
  const [newTagVal, setNewTagVal] = useState("")
  const [creating, setCreating] = useState(false)
  const [createBusy, setCreateBusy] = useState(false)

  const submitRename = async (id: string) => {
    const t = renameVal.trim()
    if (!t || t === allTags.find(tag => tag.id === id)?.name) { setRenamingId(null); return }
    setRenameBusy(true); await onRename(id, t); setRenameBusy(false); setRenamingId(null)
  }

  const submitCreate = async () => {
    const name = newTagVal.trim()
    if (!name) return
    setCreateBusy(true); await onCreateTag(name); setCreateBusy(false)
    setNewTagVal(""); setCreating(false)
  }

  if (allTags.length === 0 && !creating) {
    return (
      <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Tags</span>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-xs text-[#003434] hover:underline">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New tag
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-xl mb-3 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between">
        <button onClick={onToggle} className="flex items-center gap-2 text-left">
          <svg className="w-3.5 h-3.5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
          <span className="text-sm font-semibold text-zinc-700">Tags</span>
          <span className="text-xs text-zinc-400">({allTags.length})</span>
        </button>
        <div className="flex items-center gap-2">
          {creating ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                className="border border-zinc-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#003434]/20 w-32"
                placeholder="Tag name…"
                value={newTagVal}
                onChange={e => setNewTagVal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitCreate(); if (e.key === "Escape") { setCreating(false); setNewTagVal("") } }}
              />
              <button onClick={submitCreate} disabled={createBusy || !newTagVal.trim()} className="text-xs bg-[#003434] text-white px-2.5 py-1 rounded-lg hover:bg-[#004444] disabled:opacity-40">{createBusy ? "…" : "Create"}</button>
              <button onClick={() => { setCreating(false); setNewTagVal("") }} className="text-xs text-zinc-400 hover:text-zinc-600">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-[#003434] border border-dashed border-zinc-300 hover:border-[#003434] px-2.5 py-1 rounded-full transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New tag
            </button>
          )}
          <button onClick={onToggle} className="text-zinc-400 hover:text-zinc-600 p-0.5">
            <svg className={`w-4 h-4 transition-transform ${open ? "" : "rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-zinc-100 divide-y divide-zinc-50">
          {allTags.map(tag => {
            const count = contacts.filter(c => c.tags.some(t => t.id === tag.id)).length
            return (
              <div key={tag.id} className="px-4 py-2.5 flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                {renamingId === tag.id ? (
                  <input
                    autoFocus
                    className="flex-1 border border-zinc-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#003434]/20 max-w-[180px]"
                    value={renameVal}
                    onChange={e => setRenameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") submitRename(tag.id); if (e.key === "Escape") setRenamingId(null) }}
                    onBlur={() => submitRename(tag.id)}
                  />
                ) : (
                  <span className="flex-1 text-sm text-zinc-700">{tag.name}</span>
                )}
                <span className="text-xs text-zinc-400 shrink-0 min-w-[60px]">{count} contact{count !== 1 ? "s" : ""}</span>
                {renamingId === tag.id ? (
                  <button onClick={() => submitRename(tag.id)} disabled={renameBusy} className="text-xs bg-[#003434] text-white px-2.5 py-1 rounded-lg hover:bg-[#004444] disabled:opacity-40 shrink-0">{renameBusy ? "…" : "Save"}</button>
                ) : (
                  <button
                    onClick={() => { setRenamingId(tag.id); setRenameVal(tag.name) }}
                    className="text-xs text-zinc-400 hover:text-[#003434] flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg hover:bg-zinc-50 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Rename
                  </button>
                )}
                <button
                  onClick={() => onDelete(tag.id)}
                  className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Delete
                </button>
              </div>
            )
          })}
        </div>
      )}
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

// Tag pill dropdown — Rename / Remove from contact only (no global delete)
function TagPillDropdown({ tag, onRename, onRemove, onClose }: {
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
          <button className="w-full text-left px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 flex items-center gap-2" onClick={async () => { setBusy(true); await onRemove(); setBusy(false); onClose() }} disabled={busy}>
            <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            Remove from contact
          </button>
        </>
      ) : (
        <div className="px-2 py-1.5 flex gap-1.5">
          <input autoFocus className="flex-1 min-w-0 border border-zinc-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#003434]/20 w-20" value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose() }} />
          <button className="text-xs bg-[#003434] text-white px-2.5 py-1 rounded-lg hover:bg-[#004444] disabled:opacity-50 shrink-0" onClick={submit} disabled={busy}>{busy ? "…" : "Save"}</button>
        </div>
      )}
    </div>
  )
}

// Multi-select popover for adding/removing tags on a single contact
function AddTagPopover({ contactId, clientId, allTags, contactTags, onApply, onNewTag, onClose }: {
  contactId: string; clientId: string; allTags: EmailTag[]; contactTags: EmailTag[]
  onApply: (contactId: string, toAdd: string[], toRemove: string[]) => Promise<void>
  onNewTag: (tag: EmailTag) => void
  onClose: () => void
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set(contactTags.map(t => t.id)))
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
    const toAdd = Array.from(checked).filter(id => !contactTags.find(t => t.id === id))
    const toRemove = contactTags.filter(t => !checked.has(t.id)).map(t => t.id)
    if (!toAdd.length && !toRemove.length) { onClose(); return }
    setBusy(true); await onApply(contactId, toAdd, toRemove); setBusy(false); onClose()
  }

  const create = async (name: string) => {
    setBusy(true)
    const res = await fetch("/api/email/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: clientId, name }) })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setBusy(false); return }
    onNewTag(data)
    setChecked(prev => new Set(Array.from(prev).concat(data.id)))
    setInput(""); setBusy(false)
  }

  return (
    <div ref={ref} className={`absolute z-50 ${flipUp ? "bottom-full mb-1.5" : "top-full mt-1.5"} left-0 bg-white border border-zinc-200 rounded-xl shadow-xl w-52`} onClick={e => e.stopPropagation()}>
      <div className="p-2 border-b border-zinc-100">
        <input autoFocus className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Search tags…" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Escape" && onClose()} />
      </div>
      <div className="py-1 max-h-40 overflow-y-auto">
        {filtered.map(t => (
          <label key={t.id} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-50 cursor-pointer">
            <input type="checkbox" checked={checked.has(t.id)} onChange={() => toggle(t.id)} className="w-3.5 h-3.5 rounded border-zinc-300 accent-[#003434] cursor-pointer" />
            <span className="text-xs text-zinc-700">{t.name}</span>
          </label>
        ))}
        {filtered.length === 0 && !input.trim() && <p className="px-3 py-2 text-xs text-zinc-400">No tags yet</p>}
      </div>
      {input.trim() && !allTags.find(t => t.name.toLowerCase() === input.toLowerCase()) && (
        <div className="border-t border-zinc-100">
          <button className="w-full text-left px-3 py-2 text-xs text-[#003434] hover:bg-teal-50 flex items-center gap-2 font-medium" onClick={() => create(input.trim())} disabled={busy}>
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

// Multi-select popover for bulk-adding tags to selected contacts
function BulkTagPopover({ allTags, onApply, onClose }: {
  allTags: EmailTag[]
  onApply: (tagIds: string[]) => Promise<void>
  onClose: () => void
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
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
    if (!checked.size) { onClose(); return }
    setBusy(true); await onApply(Array.from(checked)); setBusy(false); onClose()
  }

  return (
    <div ref={ref} className={`absolute z-50 ${flipUp ? "bottom-full mb-1.5" : "top-full mt-1.5"} left-0 bg-white border border-zinc-200 rounded-xl shadow-xl w-52`} onClick={e => e.stopPropagation()}>
      <div className="p-2 border-b border-zinc-100">
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Add tags to selected</p>
        <input autoFocus className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Search…" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Escape" && onClose()} />
      </div>
      <div className="py-1 max-h-40 overflow-y-auto">
        {filtered.map(t => (
          <label key={t.id} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-50 cursor-pointer">
            <input type="checkbox" checked={checked.has(t.id)} onChange={() => toggle(t.id)} className="w-3.5 h-3.5 rounded border-zinc-300 accent-[#003434] cursor-pointer" />
            <span className="text-xs text-zinc-700">{t.name}</span>
          </label>
        ))}
        {filtered.length === 0 && <p className="px-3 py-2 text-xs text-zinc-400">No tags found</p>}
      </div>
      <div className="border-t border-zinc-100 p-2">
        <button onClick={apply} disabled={busy || !checked.size} className="w-full bg-[#003434] text-white text-xs py-1.5 rounded-lg hover:bg-[#004444] disabled:opacity-40 transition-colors">
          {busy ? "Applying…" : `Apply${checked.size > 0 ? ` (${checked.size} tag${checked.size !== 1 ? "s" : ""})` : ""}`}
        </button>
      </div>
    </div>
  )
}

export default function ContactsPage() {
  const { clientId } = useClient()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [lists, setLists] = useState<EmailList[]>([])
  const [allTags, setAllTags] = useState<EmailTag[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [form, setForm] = useState({ client_id: "", email: "", name: "", list_id: "", tagIds: [] as string[] })
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importClientId, setImportClientId] = useState("")
  const [importListId, setImportListId] = useState("")
  const [importTagIds, setImportTagIds] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  // Confirm dialog
  const [dialog, setDialog] = useState<DialogState>(null)

  // Multi-select contacts
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkTagOpen, setBulkTagOpen] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)

  // Tags manager
  const [tagsOpen, setTagsOpen] = useState(true)

  // Tag filter bar
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [showOverflow, setShowOverflow] = useState(false)
  const [showCreateTag, setShowCreateTag] = useState(false)
  const [newGlobalTag, setNewGlobalTag] = useState("")
  const overflowRef = useRef<HTMLDivElement>(null)
  const createTagRef = useRef<HTMLDivElement>(null)
  const bulkTagRef = useRef<HTMLDivElement>(null)

  // Per-row tag UI
  const [openPillDropdown, setOpenPillDropdown] = useState<{ contactId: string; tag: EmailTag } | null>(null)
  const [openAddTag, setOpenAddTag] = useState<string | null>(null)

  useEffect(() => {
    if (clientId) { setForm(f => ({ ...f, client_id: clientId, list_id: "", tagIds: [] })); setImportClientId(clientId); setImportListId(""); setImportTagIds([]) }
  }, [clientId])

  useEffect(() => {
    if (!clientId) { setLists([]); return }
    fetch(`/api/email/lists?client_id=${clientId}`).then(r => r.json()).then(d => setLists(Array.isArray(d) ? d : []))
  }, [clientId])

  const loadTags = useCallback(() => {
    if (!clientId) { setAllTags([]); return }
    fetch(`/api/email/tags?client_id=${clientId}`).then(r => r.json()).then(d => setAllTags(Array.isArray(d) ? d : []))
  }, [clientId])

  useEffect(() => { loadTags() }, [loadTags])

  const load = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set("search", search)
    if (clientId) p.set("client_id", clientId)
    fetch(`/api/email/contacts?${p}`).then(r => r.json()).then(d => setContacts(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }, [search, clientId])

  useEffect(() => { load() }, [load])
  useEffect(() => { setSelected(new Set()) }, [search, filterTag])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) setShowOverflow(false)
      if (createTagRef.current && !createTagRef.current.contains(e.target as Node)) { setShowCreateTag(false); setNewGlobalTag("") }
      if (bulkTagRef.current && !bulkTagRef.current.contains(e.target as Node)) setBulkTagOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const visibleContacts = filterTag ? contacts.filter(c => c.tags.some(t => t.id === filterTag)) : contacts
  const allSelected = visibleContacts.length > 0 && visibleContacts.every(c => selected.has(c.id))
  const someSelected = selected.size > 0

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleAll = () => { if (allSelected) setSelected(new Set()); else setSelected(new Set(visibleContacts.map(c => c.id))) }

  // ─── Handlers ───

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setAdding(true)
    try {
      const res = await fetch("/api/email/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: form.client_id, email: form.email, name: form.name, tag_ids: form.tagIds }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const extras: string[] = []
      if (form.tagIds.length) {
        const names = form.tagIds.map(id => allTags.find(t => t.id === id)?.name).filter(Boolean)
        if (names.length) extras.push(`tagged: ${names.join(", ")}`)
      }
      if (form.list_id) {
        const lr = await fetch(`/api/email/lists/${form.list_id}/contacts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email }) })
        if (!lr.ok) { const le = await lr.json(); toast.error(`Contact added but list failed: ${le.error}`) }
        else extras.push("added to list")
      }
      toast.success(extras.length ? `Contact added — ${extras.join(", ")}` : "Contact added")
      setForm({ client_id: clientId, email: "", name: "", list_id: form.list_id, tagIds: form.tagIds }); load()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Error") }
    finally { setAdding(false) }
  }

  const handleToggleSubscribe = async (id: string, current: boolean) => {
    const res = await fetch(`/api/email/contacts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscribed: !current }) })
    if (!res.ok) { toast.error("Failed to update"); return }
    setContacts(prev => prev.map(c => c.id === id ? { ...c, subscribed: !current } : c))
    toast.success(!current ? "Re-subscribed" : "Unsubscribed")
  }

  const handleDelete = (id: string, email: string) => {
    setDialog({
      title: "Delete contact?",
      message: `${email} will be permanently removed.`,
      onConfirm: async () => {
        setDialog(null)
        const res = await fetch(`/api/email/contacts/${id}`, { method: "DELETE" })
        if (!res.ok) { toast.error("Failed to delete"); return }
        setContacts(prev => prev.filter(c => c.id !== id))
        setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
        toast.success("Contact deleted")
      },
    })
  }

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file || !importClientId) { toast.error("Select a client ID and CSV file"); return }
    setImporting(true)
    try {
      const fd = new FormData(); fd.append("client_id", importClientId); fd.append("file", file)
      importTagIds.forEach(id => fd.append("tag_id", id))
      const res = await fetch("/api/email/contacts/import", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const importExtras: string[] = []
      if (importTagIds.length) {
        const names = importTagIds.map(id => allTags.find(t => t.id === id)?.name).filter(Boolean)
        if (names.length) importExtras.push(`tagged: ${names.join(", ")}`)
      }
      if (importListId) {
        const lr = await fetch(`/api/email/lists/${importListId}/contacts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) })
        const ld = await lr.json()
        if (!lr.ok) toast.error(`Imported ${data.imported} contacts but list failed`)
        else importExtras.push(`${ld.imported} in list`)
      }
      toast.success(`Imported ${data.imported} contacts${importExtras.length ? ` — ${importExtras.join(", ")}` : ""}`)
      if (fileRef.current) fileRef.current.value = ""; load()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Import error") }
    finally { setImporting(false) }
  }

  const handleApplyTags = async (contactId: string, toAdd: string[], toRemove: string[]) => {
    await Promise.all([
      ...toAdd.map(id => fetch(`/api/email/contacts/${contactId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ add_tag_id: id }) })),
      ...toRemove.map(id => fetch(`/api/email/contacts/${contactId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ remove_tag_id: id }) }))
    ])
    setContacts(prev => prev.map(c => {
      if (c.id !== contactId) return c
      const base = c.tags.filter(t => !toRemove.includes(t.id))
      const added = allTags.filter(t => toAdd.includes(t.id))
      return { ...c, tags: [...base, ...added] }
    }))
  }

  const handleRemoveTag = async (contactId: string, tagId: string) => {
    const res = await fetch(`/api/email/contacts/${contactId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ remove_tag_id: tagId }) })
    if (!res.ok) { toast.error("Failed to remove tag"); return }
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, tags: c.tags.filter(t => t.id !== tagId) } : c))
  }

  const handleRenameTag = async (tagId: string, newName: string) => {
    const res = await fetch(`/api/email/tags/${tagId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName }) })
    if (!res.ok) { toast.error("Failed to rename tag"); return }
    setAllTags(prev => prev.map(t => t.id === tagId ? { ...t, name: newName } : t))
    setContacts(prev => prev.map(c => ({ ...c, tags: c.tags.map(t => t.id === tagId ? { ...t, name: newName } : t) })))
    if (filterTag === tagId) setFilterTag(null)
    toast.success("Tag renamed")
  }

  const handleDeleteTag = (tagId: string) => {
    const tagName = allTags.find(t => t.id === tagId)?.name ?? "this tag"
    setDialog({
      title: "Delete tag?",
      message: `"${tagName}" will be removed from all contacts permanently.`,
      confirmLabel: "Delete tag",
      onConfirm: async () => {
        setDialog(null)
        const res = await fetch(`/api/email/tags/${tagId}`, { method: "DELETE" })
        if (!res.ok) { toast.error("Failed to delete tag"); return }
        setAllTags(prev => prev.filter(t => t.id !== tagId))
        setContacts(prev => prev.map(c => ({ ...c, tags: c.tags.filter(t => t.id !== tagId) })))
        if (filterTag === tagId) setFilterTag(null)
        toast.success("Tag deleted")
      },
    })
  }

  const handleCreateTag = async (name: string) => {
    if (!name || !clientId) return
    const res = await fetch("/api/email/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: clientId, name }) })
    const data = await res.json()
    if (!res.ok) { toast.error(res.status === 409 ? "Tag already exists" : data.error); return }
    setAllTags(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    toast.success(`Tag "${name}" created`)
  }

  const handleCreateGlobalTag = async () => {
    const name = newGlobalTag.trim()
    await handleCreateTag(name)
    setNewGlobalTag(""); setShowCreateTag(false)
  }

  // ─── Bulk handlers ───

  const bulkAddTags = async (tagIds: string[]) => {
    setBulkBusy(true)
    await Promise.all(tagIds.flatMap(tagId =>
      Array.from(selected).map(contactId =>
        fetch(`/api/email/contacts/${contactId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ add_tag_id: tagId }) })
      )
    ))
    const tags = allTags.filter(t => tagIds.includes(t.id))
    setContacts(prev => prev.map(c => selected.has(c.id)
      ? { ...c, tags: [...c.tags, ...tags.filter(t => !c.tags.find(ct => ct.id === t.id))] }
      : c
    ))
    toast.success(`Tagged ${selected.size} contact${selected.size !== 1 ? "s" : ""} with ${tagIds.length} tag${tagIds.length !== 1 ? "s" : ""}`)
    setBulkBusy(false)
  }

  const bulkSubscribe = async (subscribed: boolean) => {
    setBulkBusy(true)
    await Promise.all(Array.from(selected).map(id =>
      fetch(`/api/email/contacts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscribed }) })
    ))
    setContacts(prev => prev.map(c => selected.has(c.id) ? { ...c, subscribed } : c))
    toast.success(`${selected.size} contact${selected.size !== 1 ? "s" : ""} ${subscribed ? "subscribed" : "unsubscribed"}`)
    setBulkBusy(false)
  }

  const bulkDelete = () => {
    setDialog({
      title: `Delete ${selected.size} contact${selected.size !== 1 ? "s" : ""}?`,
      message: "This cannot be undone. All selected contacts will be permanently removed.",
      confirmLabel: `Delete ${selected.size}`,
      onConfirm: async () => {
        setDialog(null); setBulkBusy(true)
        await Promise.all(Array.from(selected).map(id => fetch(`/api/email/contacts/${id}`, { method: "DELETE" })))
        setContacts(prev => prev.filter(c => !selected.has(c.id)))
        toast.success(`${selected.size} contacts deleted`)
        setSelected(new Set()); setBulkBusy(false)
      },
    })
  }

  const visibleTags = allTags.slice(0, TAG_VISIBLE_LIMIT)
  const overflowTags = allTags.slice(TAG_VISIBLE_LIMIT)

  const listSelect = (value: string, onChange: (v: string) => void, ph = "Add to list (optional)") =>
    lists.length > 0 ? (
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 text-zinc-700 bg-white">
        <option value="">{ph}</option>
        {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
    ) : null

  const statusBadge = (c: Contact) => {
    if (c.bounced) return <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full"><span className="w-1 h-1 rounded-full bg-red-400 inline-block" />bounced</span>
    if (c.complained) return <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full"><span className="w-1 h-1 rounded-full bg-orange-400 inline-block" />complained</span>
    if (c.subscribed) return <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full"><span className="w-1 h-1 rounded-full bg-emerald-400 inline-block" />subscribed</span>
    return <span className="inline-flex items-center gap-1 text-xs bg-zinc-100 text-zinc-500 border border-zinc-200 px-2 py-0.5 rounded-full"><span className="w-1 h-1 rounded-full bg-zinc-400 inline-block" />unsubscribed</span>
  }

  return (
    <div className="max-w-5xl">
      {dialog && <ConfirmDialog {...dialog} onCancel={() => setDialog(null)} />}

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Contacts</h1>
        <p className="text-sm text-zinc-500 mt-1">Subscriber list — CSV import, manual add, or synced from leads</p>
      </div>

      {/* Add contact + CSV import */}
      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <form onSubmit={handleAdd} className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-zinc-700">Add contact</p>
          <input className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Client ID" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} required />
          <input className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="email@example.com" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          <input className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Name (optional)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          {listSelect(form.list_id, v => setForm(f => ({ ...f, list_id: v })))}
          <TagMultiSelect allTags={allTags} value={form.tagIds} onChange={v => setForm(f => ({ ...f, tagIds: v }))} />
          <button type="submit" disabled={adding} className="bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] transition-colors disabled:opacity-50 w-full">{adding ? "Adding…" : "Add contact"}</button>
        </form>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-zinc-700">CSV import</p>
          <p className="text-xs text-zinc-400">CSV must have an <code className="bg-zinc-100 px-1 rounded">email</code> column. Optional: <code className="bg-zinc-100 px-1 rounded">name</code>.</p>
          <input className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Client ID" value={importClientId} onChange={e => setImportClientId(e.target.value)} />
          {listSelect(importListId, setImportListId)}
          <TagMultiSelect allTags={allTags} value={importTagIds} onChange={setImportTagIds} />
          <input ref={fileRef} type="file" accept=".csv" className="w-full text-sm text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200" />
          <button onClick={handleImport} disabled={importing} className="bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] transition-colors disabled:opacity-50 w-full">{importing ? "Importing…" : "Import CSV"}</button>
        </div>
      </div>

      {/* ── Tags Management Section ── */}
      <TagsManager
        allTags={allTags}
        contacts={contacts}
        onRename={handleRenameTag}
        onDelete={handleDeleteTag}
        onCreateTag={handleCreateTag}
        open={tagsOpen}
        onToggle={() => setTagsOpen(v => !v)}
      />

      {/* ── Tag filter bar ── */}
      <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 mb-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mr-1 shrink-0">Filter</span>
        <button onClick={() => setFilterTag(null)} className={`inline-flex items-center text-xs px-3 py-1 rounded-full border transition-colors shrink-0 ${filterTag === null ? "bg-[#003434] text-white border-[#003434]" : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"}`}>
          All{filterTag === null && contacts.length > 0 && <span className="ml-1.5 opacity-60 text-[10px]">{contacts.length}</span>}
        </button>
        {visibleTags.map(tag => {
          const count = contacts.filter(c => c.tags.some(t => t.id === tag.id)).length
          return (
            <button key={tag.id} onClick={() => setFilterTag(filterTag === tag.id ? null : tag.id)}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-colors shrink-0 ${filterTag === tag.id ? "bg-[#003434] text-white border-[#003434]" : "bg-teal-50 text-[#003434] border-teal-200 hover:bg-teal-100"}`}>
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
                  const count = contacts.filter(c => c.tags.some(t => t.id === tag.id)).length
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
        {filterTag && <span className="ml-auto text-xs text-zinc-400 shrink-0">{visibleContacts.length} contact{visibleContacts.length !== 1 ? "s" : ""}</span>}
      </div>

      {/* ── Bulk action bar ── */}
      {someSelected && (
        <div className="bg-[#003434] rounded-xl px-4 py-2.5 mb-3 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-white/90 shrink-0">{selected.size} selected</span>
          <span className="w-px h-4 bg-white/20 shrink-0" />
          <div className="relative shrink-0" ref={bulkTagRef}>
            <button onClick={() => setBulkTagOpen(v => !v)} disabled={bulkBusy} className="inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-2.5 py-1 transition-colors disabled:opacity-40">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              Add tags
            </button>
            {bulkTagOpen && <BulkTagPopover allTags={allTags} onApply={bulkAddTags} onClose={() => setBulkTagOpen(false)} />}
          </div>
          <button onClick={() => bulkSubscribe(true)} disabled={bulkBusy} className="text-xs text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-2.5 py-1 transition-colors disabled:opacity-40 shrink-0">Subscribe</button>
          <button onClick={() => bulkSubscribe(false)} disabled={bulkBusy} className="text-xs text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-2.5 py-1 transition-colors disabled:opacity-40 shrink-0">Unsubscribe</button>
          <button onClick={bulkDelete} disabled={bulkBusy} className="text-xs text-red-300 hover:text-red-200 border border-red-400/30 hover:border-red-400/60 rounded-lg px-2.5 py-1 transition-colors disabled:opacity-40 shrink-0">Delete</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-white/50 hover:text-white/80 transition-colors shrink-0">Clear</button>
        </div>
      )}

      {/* Contact table */}
      <div className="bg-white border border-zinc-200 rounded-xl">
        <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-3 rounded-t-xl overflow-hidden">
          <svg className="w-3.5 h-3.5 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input className="flex-1 text-sm focus:outline-none placeholder:text-zinc-400" placeholder="Search by email…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="text-xs text-zinc-400 hover:text-zinc-600" onClick={() => setSearch("")}>Clear</button>}
        </div>
        {loading ? (
          <div className="px-4 py-10 text-center"><div className="inline-block w-5 h-5 border-2 border-zinc-200 border-t-[#003434] rounded-full animate-spin" /></div>
        ) : visibleContacts.length === 0 ? (
          <div className="px-4 py-10 text-center"><p className="text-sm text-zinc-400">{filterTag ? `No contacts with tag "${allTags.find(t => t.id === filterTag)?.name}".` : "No contacts found."}</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="px-4 py-2.5 w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3.5 h-3.5 rounded border-zinc-300 cursor-pointer accent-[#003434]" />
                </th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Tags</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Added</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {visibleContacts.map(c => {
                const isChecked = selected.has(c.id)
                return (
                  <tr key={c.id} className={`border-b border-zinc-50 transition-colors ${isChecked ? "bg-teal-50/40" : "hover:bg-zinc-50/60"}`}>
                    <td className="px-4 py-3 w-8">
                      <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(c.id)} className="w-3.5 h-3.5 rounded border-zinc-300 cursor-pointer accent-[#003434]" />
                    </td>
                    <td className="px-4 py-3 text-zinc-800 font-medium text-xs">{c.email}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{c.name ?? <span className="text-zinc-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1 min-w-[80px]">
                        {c.tags.map(tag => (
                          <span key={tag.id} className="relative inline-flex">
                            <button
                              className="inline-flex items-center text-[11px] bg-teal-50 text-[#003434] border border-teal-200 px-2 py-0.5 rounded-full hover:bg-teal-100 transition-colors gap-1"
                              onClick={() => setOpenPillDropdown(
                                openPillDropdown?.contactId === c.id && openPillDropdown.tag.id === tag.id ? null : { contactId: c.id, tag }
                              )}
                            >
                              {tag.name}
                              <svg className="w-2 h-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {openPillDropdown?.contactId === c.id && openPillDropdown.tag.id === tag.id && (
                              <TagPillDropdown
                                tag={tag}
                                onRename={handleRenameTag}
                                onRemove={() => handleRemoveTag(c.id, tag.id)}
                                onClose={() => setOpenPillDropdown(null)}
                              />
                            )}
                          </span>
                        ))}
                        <span className="relative">
                          <button
                            className="w-5 h-5 flex items-center justify-center text-zinc-300 hover:text-[#003434] border border-dashed border-zinc-200 hover:border-teal-300 rounded-full transition-colors"
                            title="Add/remove tags"
                            onClick={() => setOpenAddTag(openAddTag === c.id ? null : c.id)}
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                          </button>
                          {openAddTag === c.id && (
                            <AddTagPopover
                              contactId={c.id}
                              clientId={clientId}
                              allTags={allTags}
                              contactTags={c.tags}
                              onApply={handleApplyTags}
                              onNewTag={tag => setAllTags(prev => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))}
                              onClose={() => setOpenAddTag(null)}
                            />
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{statusBadge(c)}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">{new Date(c.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        {!c.bounced && !c.complained && (
                          <button onClick={() => handleToggleSubscribe(c.id, c.subscribed)} className={`text-xs underline underline-offset-2 ${c.subscribed ? "text-zinc-400 hover:text-zinc-600" : "text-emerald-500 hover:text-emerald-700"}`}>
                            {c.subscribed ? "Unsubscribe" : "Re-subscribe"}
                          </button>
                        )}
                        <button onClick={() => handleDelete(c.id, c.email)} className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2">Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
