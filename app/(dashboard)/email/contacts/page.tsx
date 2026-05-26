"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { createPortal } from "react-dom"
import toast from "react-hot-toast"
import { useClient } from "../client-context"

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailTag { id: string; name: string }
interface Contact {
  id: string; client_id: string; email: string; name: string | null
  first_name: string | null; last_name: string | null
  phone: string | null; alternate_phone: string | null; company: string | null
  street_address: string | null; street_number: string | null
  neighborhood: string | null; postal_code: string | null; city: string | null
  state_province: string | null; country: string | null; tax_number: string | null
  language: string | null; user_name: string | null; user_type: string | null
  agent_name: string | null; agent_id: string | null; agent_registered_date: string | null
  agent_pancard_no: string | null; agent_gst_number: string | null
  subscribed: boolean; bounced: boolean; complained: boolean
  created_at: string; tags: EmailTag[]
  [key: string]: unknown
}
interface EmailList { id: string; name: string }
interface ImportLog {
  id: string; file_name: string | null; delimiter: string
  total_rows: number; imported: number; invalid: number
  status: string; created_at: string
}
interface CustomField { key: string; label: string; value: string }
type View = "list" | "create" | "import"
type DialogState = {
  title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void
} | null
interface SidebarFilters {
  emailSearch: string
  tagIds: string[]
  dateFrom: string
  dateTo: string
  status: "all" | "subscribed" | "unsubscribed" | "bounced" | "complained"
  firstName: string
  lastName: string
  phone: string
  company: string
  city: string
  stateProvince: string
  country: string
  agentId: string
  userType: string
  agentName: string
  userName: string
  language: string
}
interface SavedFilter { id: string; label: string; filters: SidebarFilters }

const DEFAULT_FILTERS: SidebarFilters = {
  emailSearch: "", tagIds: [], dateFrom: "", dateTo: "", status: "all",
  firstName: "", lastName: "", phone: "", company: "", city: "",
  stateProvince: "", country: "", agentId: "", userType: "",
  agentName: "", userName: "", language: "",
}

// ─── Reusable hooks ────────────────────────────────────────────────────────────

function useFlipUp(ref: React.RefObject<HTMLDivElement>) {
  const [flipUp, setFlipUp] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    if (rect.bottom > window.innerHeight - 8) setFlipUp(true)
  })
  return flipUp
}

// ─── Shared sub-components ────────────────────────────────────────────────────

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

function TagPillDropdown({ tag, onRename, onRemove, onClose }: {
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

function AddTagPopover({ contactId, clientId, allTags, contactTags, anchorRef, onApply, onNewTag, onClose }: {
  contactId: string; clientId: string; allTags: EmailTag[]; contactTags: EmailTag[]
  anchorRef: React.RefObject<HTMLButtonElement>
  onApply: (contactId: string, toAdd: string[], toRemove: string[]) => Promise<void>
  onNewTag: (tag: EmailTag) => void; onClose: () => void
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set(contactTags.map(t => t.id)))
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const filtered = input.trim() ? allTags.filter(t => t.name.toLowerCase().includes(input.toLowerCase())) : allTags

  // Compute position from the anchor button on mount
  useEffect(() => {
    if (!anchorRef.current) return
    const r = anchorRef.current.getBoundingClientRect()
    const popoverWidth = 208 // w-52
    const left = Math.min(r.right - popoverWidth, window.innerWidth - popoverWidth - 8)
    setPos({ top: r.bottom + window.scrollY + 6, left: Math.max(left, 8) })
  }, [anchorRef])

  // Flip above if it would overflow viewport bottom
  useEffect(() => {
    if (!ref.current || !anchorRef.current) return
    const r = anchorRef.current.getBoundingClientRect()
    const popH = ref.current.offsetHeight
    if (r.bottom + popH + 6 > window.innerHeight) {
      setPos(prev => prev ? { ...prev, top: r.top + window.scrollY - popH - 6 } : prev)
    }
  })

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [onClose, anchorRef])

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

  if (!pos) return null

  return createPortal(
    <div
      ref={ref}
      style={{ position: "absolute", top: pos.top, left: pos.left, zIndex: 9999 }}
      className="bg-white border border-zinc-200 rounded-xl shadow-xl w-52"
      onClick={e => e.stopPropagation()}
    >
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
    </div>,
    document.body
  )
}

function BulkTagPopover({ allTags, onApply, onClose }: {
  allTags: EmailTag[]; onApply: (tagIds: string[]) => Promise<void>; onClose: () => void
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

// ─── Sidebar filter panel ─────────────────────────────────────────────────────

function SidebarFilters({ filters, allTags, onChange, savedFilters, onSave, onLoadFilter, onDeleteFilter, onReset }: {
  filters: SidebarFilters; allTags: EmailTag[]
  onChange: (f: SidebarFilters) => void
  savedFilters: SavedFilter[]
  onSave: (pending: SidebarFilters) => void
  onLoadFilter: (f: SavedFilter) => void
  onDeleteFilter: (id: string) => void
  onReset: () => void
}) {
  const [tab, setTab] = useState<"filter" | "saved">("filter")
  // Local pending state — only pushed to parent on Apply
  const [pending, setPending] = useState<SidebarFilters>(filters)
  type Section = "email" | "firstName" | "lastName" | "phone" | "company" | "city" | "stateProvince" | "country" | "agentId" | "userType" | "agentName" | "userName" | "language" | "tag" | "date" | "status"
  const [expanded, setExpanded] = useState<Partial<Record<Section, boolean>>>({ email: true })
  const tog = (s: Section) => setExpanded(p => ({ ...p, [s]: !p[s] }))

  const Hdr = ({ label, section }: { label: string; section: Section }) => (
    <button
      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors ${expanded[section] ? "border-l-2 border-[#003434] bg-[#003434]/5" : ""}`}
      onClick={() => tog(section)}
    >
      <span className="font-medium text-sm">{label}</span>
      <svg className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${expanded[section] ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
    </button>
  )

  const TextFilter = ({ section, placeholder, field }: { section: Section; placeholder: string; field: keyof SidebarFilters }) => (
    <div>
      <Hdr label={placeholder} section={section} />
      {expanded[section] && (
        <div className="px-4 pb-2.5 pt-1">
          <input
            className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
            placeholder={`Search ${placeholder.toLowerCase()}…`}
            value={pending[field] as string}
            onChange={e => setPending(p => ({ ...p, [field]: e.target.value }))}
          />
        </div>
      )}
    </div>
  )

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col h-fit">
      {/* Tabs */}
      <div className="flex border-b border-zinc-100">
        {(["filter", "saved"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t ? "text-[#003434] border-b-2 border-[#003434]" : "text-zinc-500 hover:text-zinc-700"}`}>
            {t === "filter" ? "Filter by" : "Saved filters"}
          </button>
        ))}
      </div>

      {tab === "filter" && (
        <div className="flex-1 divide-y divide-zinc-100 max-h-[70vh] overflow-y-auto">
          <TextFilter section="email" placeholder="Email" field="emailSearch" />
          <TextFilter section="firstName" placeholder="First name" field="firstName" />
          <TextFilter section="lastName" placeholder="Last name" field="lastName" />
          <TextFilter section="phone" placeholder="Phone number" field="phone" />
          <TextFilter section="company" placeholder="Company name" field="company" />
          <TextFilter section="city" placeholder="City" field="city" />
          <TextFilter section="stateProvince" placeholder="State / Province" field="stateProvince" />

          {/* Country */}
          <div>
            <Hdr label="Country" section="country" />
            {expanded.country && (
              <div className="px-4 pb-2.5 pt-1">
                <select
                  className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white"
                  value={pending.country}
                  onChange={e => setPending(p => ({ ...p, country: e.target.value }))}
                >
                  <option value="">All countries</option>
                  {["India","United States","United Kingdom","Australia","Canada","Singapore","UAE","Germany","France","Netherlands","Other"].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <TextFilter section="agentId" placeholder="Agent Id" field="agentId" />
          <TextFilter section="userType" placeholder="User Type" field="userType" />
          <TextFilter section="agentName" placeholder="Agent Name" field="agentName" />
          <TextFilter section="userName" placeholder="User Name" field="userName" />

          {/* Language */}
          <div>
            <Hdr label="Language" section="language" />
            {expanded.language && (
              <div className="px-4 pb-2.5 pt-1">
                <select
                  className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white"
                  value={pending.language}
                  onChange={e => setPending(p => ({ ...p, language: e.target.value }))}
                >
                  <option value="">All languages</option>
                  {["English","Hindi","Marathi","Tamil","Telugu","Kannada","Bengali","Gujarati","Other"].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Tag */}
          <div>
            <Hdr label="Tag" section="tag" />
            {expanded.tag && (
              <div className="px-4 pb-2.5 pt-1 max-h-40 overflow-y-auto space-y-1">
                {allTags.length === 0 && <p className="text-xs text-zinc-400">No tags yet</p>}
                {allTags.map(tag => (
                  <label key={tag.id} className="flex items-center gap-2.5 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pending.tagIds.includes(tag.id)}
                      onChange={() => {
                        const next = pending.tagIds.includes(tag.id)
                          ? pending.tagIds.filter(id => id !== tag.id)
                          : [...pending.tagIds, tag.id]
                        setPending(p => ({ ...p, tagIds: next }))
                      }}
                      className="w-3.5 h-3.5 rounded border-zinc-300 accent-[#003434] cursor-pointer"
                    />
                    <span className="text-xs text-zinc-700">{tag.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Date added */}
          <div>
            <Hdr label="Date added" section="date" />
            {expanded.date && (
              <div className="px-4 pb-2.5 pt-1 space-y-2">
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1 block">From</label>
                  <input type="date" className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003434]/20" value={pending.dateFrom} onChange={e => setPending(p => ({ ...p, dateFrom: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1 block">To</label>
                  <input type="date" className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003434]/20" value={pending.dateTo} onChange={e => setPending(p => ({ ...p, dateTo: e.target.value }))} />
                </div>
              </div>
            )}
          </div>

          {/* Contact state */}
          <div>
            <Hdr label="Contact state" section="status" />
            {expanded.status && (
              <div className="px-4 pb-2.5 pt-1 space-y-1.5">
                {(["all", "subscribed", "unsubscribed", "bounced", "complained"] as const).map(s => (
                  <label key={s} className="flex items-center gap-2.5 py-0.5 cursor-pointer">
                    <input type="radio" name="sidebar-status" checked={pending.status === s} onChange={() => setPending(p => ({ ...p, status: s }))} className="w-3.5 h-3.5 border-zinc-300 accent-[#003434] cursor-pointer" />
                    <span className="text-xs text-zinc-700 capitalize">{s === "all" ? "All" : s}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "saved" && (
        <div className="flex-1 p-3 space-y-2 min-h-[120px]">
          {savedFilters.length === 0 && <p className="text-xs text-zinc-400 text-center py-4">No saved filters yet</p>}
          {savedFilters.map(sf => (
            <div key={sf.id} className="flex items-center gap-2 bg-zinc-50 rounded-lg px-3 py-2 border border-zinc-100">
              <button className="flex-1 text-left text-xs text-zinc-700 font-medium hover:text-[#003434] truncate" onClick={() => { setPending(sf.filters); onLoadFilter(sf) }}>{sf.label}</button>
              <button onClick={() => onDeleteFilter(sf.id)} className="text-zinc-300 hover:text-red-400 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-zinc-100 p-3 space-y-2">
        {tab === "filter" && (<>
          <button
            onClick={() => onChange(pending)}
            className="w-full text-sm py-2 rounded-lg bg-[#003434] text-white hover:bg-[#004444] transition-colors font-medium"
          >
            Apply filter
          </button>
          <button onClick={() => onSave(pending)} className="w-full text-sm py-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors font-medium">
            Save filter
          </button>
        </>)}
        <button onClick={() => { setPending(DEFAULT_FILTERS); onReset() }} className="w-full text-xs text-zinc-400 hover:text-zinc-600 transition-colors">Reset</button>
        <button
          onClick={() => toast("Soft delete not configured — contacts are permanently deleted")}
          className="w-full text-xs text-zinc-400 hover:text-zinc-600 transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          Recently deleted
        </button>
      </div>
    </div>
  )
}

// ─── Custom field modal ───────────────────────────────────────────────────────

function CustomFieldModal({ onClose, onSave }: { onClose: () => void; onSave: (field: CustomField) => void }) {
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [manualSql, setManualSql] = useState("")
  const columnName = "custom_" + name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")

  const handleSave = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      const res = await fetch("/api/email/contacts/add-column", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column_name: columnName, label: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.manual) {
        // exec_sql RPC not available — show the SQL for manual run, but still add to form
        setManualSql(data.sql)
        toast(`Run this SQL in Supabase: ${data.sql}`, { duration: 10000 })
      }
      onSave({ key: columnName, label: name.trim(), value: "" })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create column")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-zinc-100">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-zinc-900">Create custom field</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1.5">Name</label>
            <input
              autoFocus
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
              placeholder="e.g. Company Size"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && name.trim() && handleSave()}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1.5">
              Unique key
              <span className="ml-1.5 text-xs font-normal text-zinc-400">(auto-generated, saved as column)</span>
            </label>
            <input className="w-full border border-zinc-100 rounded-lg px-3 py-2 text-sm bg-zinc-50 text-zinc-400 cursor-not-allowed font-mono" value={columnName || "custom_field_name"} readOnly />
          </div>
          {manualSql && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">Run this SQL in Supabase SQL editor:</p>
              <code className="text-[11px] text-amber-800 break-all">{manualSql}</code>
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSave}
            disabled={!name.trim() || busy}
            className="bg-[#003434] text-white text-sm px-5 py-2 rounded-lg hover:bg-[#004444] disabled:opacity-40 transition-colors inline-flex items-center gap-2"
          >
            {busy && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {busy ? "Creating…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Column mapping constants ─────────────────────────────────────────────────

const CONTACT_FIELD_OPTIONS: { value: string; label: string }[] = [
  { value: "email", label: "Email *" },
  { value: "first_name", label: "First name" },
  { value: "last_name", label: "Last name" },
  { value: "phone", label: "Phone number" },
  { value: "alternate_phone", label: "Alternate phone" },
  { value: "company", label: "Company" },
  { value: "street_address", label: "Street address" },
  { value: "street_number", label: "Street number" },
  { value: "neighborhood", label: "Neighborhood" },
  { value: "postal_code", label: "Postal code" },
  { value: "city", label: "City" },
  { value: "state_province", label: "State / Province" },
  { value: "country", label: "Country" },
  { value: "tax_number", label: "Tax number" },
  { value: "language", label: "Language" },
  { value: "user_name", label: "User name" },
  { value: "user_type", label: "User type" },
  { value: "agent_name", label: "Agent name" },
  { value: "agent_id", label: "Agent ID" },
  { value: "agent_registered_date", label: "Agent registered date" },
  { value: "agent_pancard_no", label: "Agent PAN card no." },
  { value: "agent_gst_number", label: "Agent GST number" },
]

const FIELD_ALIASES: Record<string, string> = {
  email: "email", emailaddress: "email",
  firstname: "first_name", first: "first_name",
  lastname: "last_name", last: "last_name",
  phone: "phone", phonenumber: "phone", mobile: "phone",
  alternatephone: "alternate_phone", altphone: "alternate_phone",
  company: "company", organization: "company",
  streetaddress: "street_address", address: "street_address",
  streetnumber: "street_number",
  neighborhood: "neighborhood",
  postalcode: "postal_code", zip: "postal_code", zipcode: "postal_code",
  city: "city",
  stateprovince: "state_province", state: "state_province", province: "state_province",
  country: "country",
  taxnumber: "tax_number", vat: "tax_number",
  language: "language",
  username: "user_name",
  usertype: "user_type",
  agentname: "agent_name",
  agentid: "agent_id",
  agentregistereddate: "agent_registered_date",
  agentpancardno: "agent_pancard_no", pancard: "agent_pancard_no",
  agentgstnumber: "agent_gst_number", gst: "agent_gst_number",
}

function autoDetectField(h: string): string {
  const key = h.toLowerCase().replace(/[\s_\-]/g, "")
  return FIELD_ALIASES[key] ?? ""
}

// ─── Column mapping step ──────────────────────────────────────────────────────

function ColumnMappingStep({ csvPreview, columnMap, onMapChange, csvEditMode, csvEditRows, onEditRowChange, onToggleEditMode, onPrevious, onImport, importBusy }: {
  csvPreview: { headers: string[]; rows: string[][] }
  columnMap: Record<number, string>
  onMapChange: (colIdx: number, fieldKey: string) => void
  csvEditMode: boolean
  csvEditRows: string[][]
  onEditRowChange: (rowIdx: number, colIdx: number, val: string) => void
  onToggleEditMode: () => void
  onPrevious: () => void
  onImport: () => void
  importBusy: boolean
}) {
  const usedFields = new Set(Object.values(columnMap).filter(v => v !== ""))

  return (
    <div className="w-full">
      <p className="text-sm text-zinc-600 mb-4">
        Below is a sample from your file. Please select the data type for each column.
      </p>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden mb-4">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-white">
              {/* Dropdown row */}
              <tr className="border-b border-zinc-200">
                {csvPreview.headers.map((_, colIdx) => {
                  const selected = columnMap[colIdx] ?? ""
                  return (
                    <th key={colIdx} className="px-3 py-2.5 text-left font-normal min-w-[160px]">
                      <select
                        value={selected}
                        onChange={e => onMapChange(colIdx, e.target.value)}
                        className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white"
                      >
                        <option value="">Select (skip)</option>
                        {CONTACT_FIELD_OPTIONS.map(opt => (
                          <option
                            key={opt.value}
                            value={opt.value}
                            disabled={opt.value !== selected && usedFields.has(opt.value)}
                          >
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </th>
                  )
                })}
              </tr>
              {/* CSV header name row */}
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                {csvPreview.headers.map((h, colIdx) => (
                  <th key={colIdx} className="px-3 py-2 text-left text-[11px] font-normal text-zinc-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(csvEditMode ? csvEditRows : csvPreview.rows).map((row, rowIdx) => (
                <tr key={rowIdx} className={`border-b border-zinc-50 ${rowIdx % 2 === 1 ? "bg-zinc-50/40" : ""}`}>
                  {csvPreview.headers.map((_, colIdx) => {
                    const val = (csvEditMode ? csvEditRows : csvPreview.rows)[rowIdx]?.[colIdx] ?? ""
                    return (
                      <td key={colIdx} className="px-3 py-2.5 text-xs text-zinc-700 min-w-[160px]">
                        {csvEditMode ? (
                          <input
                            value={val}
                            onChange={e => onEditRowChange(rowIdx, colIdx, e.target.value)}
                            className="w-full border border-zinc-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#003434]/20"
                          />
                        ) : (
                          <span className="block truncate max-w-[200px]">{val || <span className="text-zinc-300">—</span>}</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onToggleEditMode}
          className={`inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border transition-colors ${
            csvEditMode ? "border-[#003434] text-[#003434] bg-[#003434]/5" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          {csvEditMode ? "Done editing" : "Edit"}
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onPrevious} className="text-sm px-4 py-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors">
            Previous
          </button>
          <button
            type="button"
            onClick={onImport}
            disabled={importBusy}
            className="inline-flex items-center gap-2 bg-[#003434] text-white text-sm px-5 py-2 rounded-lg hover:bg-[#004444] disabled:opacity-40 transition-colors"
          >
            {importBusy ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Import
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Import warnings panel ────────────────────────────────────────────────────

function ImportWarningsPanel() {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 rounded-xl p-5">
      <div className="flex items-start gap-2 mb-3">
        <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <p className="text-sm font-semibold text-amber-800">Important: read before importing</p>
      </div>
      <ul className="space-y-3">
        {[
          { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", title: "Explicit consent is required", body: "Only import contacts who have agreed to receive your emails." },
          { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", title: "Clean your list", body: "Ensure there are no invalid or inactive email addresses." },
          { icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z", title: "Invalid emails skipped", body: "Rows without a valid @ address will be skipped automatically." },
          { icon: "M13 10V3L4 14h7v7l9-11h-7z", title: "Warm-up", body: "Large imports may be sent gradually to protect your deliverability." },
        ].map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-800">{item.title}</p>
              <p className="text-xs text-amber-700 mt-0.5">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Row actions kebab menu ───────────────────────────────────────────────────

function RowActions({ contact, onToggleSubscribe, onDelete }: {
  contact: Contact; onToggleSubscribe: () => void; onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  function handleOpen() {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const menuH = 90 // approx height of menu
    const spaceBelow = window.innerHeight - rect.bottom
    const style: React.CSSProperties = {
      position: "fixed",
      right: window.innerWidth - rect.right,
      zIndex: 9999,
      minWidth: 160,
    }
    if (spaceBelow < menuH + 8) {
      style.bottom = window.innerHeight - rect.top + 4
    } else {
      style.top = rect.bottom + 4
    }
    setMenuStyle(style)
    setOpen(v => !v)
  }

  return (
    <div className="relative">
      <button ref={btnRef} onClick={handleOpen} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
      </button>
      {open && (
        <div ref={menuRef} style={menuStyle} className="bg-white border border-zinc-200 rounded-xl shadow-xl py-1.5">
          {!contact.bounced && !contact.complained && (
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
              onClick={() => { setOpen(false); onToggleSubscribe() }}
            >
              <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {contact.subscribed ? "Unsubscribe" : "Re-subscribe"}
            </button>
          )}
          <div className="my-1 border-t border-zinc-100" />
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2"
            onClick={() => { setOpen(false); onDelete() }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Contact drawer ───────────────────────────────────────────────────────────

function ContactDrawer({ contact, allTags, onClose, onSave, onDelete, onResetBounce }: {
  contact: Contact
  allTags: EmailTag[]
  onClose: () => void
  onSave: (id: string, fields: Record<string, unknown>, tagIds: string[]) => Promise<void>
  onDelete: (id: string, email: string) => void
  onResetBounce: (id: string) => Promise<void>
}) {
  const [form, setForm] = useState({
    first_name: contact.first_name ?? "",
    last_name: contact.last_name ?? "",
    phone: contact.phone ?? "",
    alternate_phone: contact.alternate_phone ?? "",
    company: contact.company ?? "",
    street_address: contact.street_address ?? "",
    street_number: contact.street_number ?? "",
    neighborhood: contact.neighborhood ?? "",
    postal_code: contact.postal_code ?? "",
    city: contact.city ?? "",
    state_province: contact.state_province ?? "",
    country: contact.country ?? "",
    tax_number: contact.tax_number ?? "",
    language: contact.language ?? "English",
    user_name: contact.user_name ?? "",
    user_type: contact.user_type ?? "",
    agent_name: contact.agent_name ?? "",
    agent_id: contact.agent_id ?? "",
    agent_registered_date: contact.agent_registered_date ?? "",
    agent_pancard_no: contact.agent_pancard_no ?? "",
    agent_gst_number: contact.agent_gst_number ?? "",
  })
  const [tagIds, setTagIds] = useState<string[]>(contact.tags.map(t => t.id))
  const [busy, setBusy] = useState(false)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSave = async () => {
    setBusy(true)
    await onSave(contact.id, form, tagIds)
    setBusy(false)
  }

  const inp = (label: string, key: keyof typeof form, type = "text") => (
    <div>
      <label className="text-xs font-medium text-zinc-500 block mb-1">{label}</label>
      <input
        type={type}
        className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
        value={form[key]}
        onChange={set(key)}
      />
    </div>
  )

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[480px] max-w-full bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 truncate">{contact.email}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "No name"}</p>
          </div>
          <button onClick={onClose} className="ml-3 shrink-0 text-zinc-400 hover:text-zinc-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Bounce warning banner */}
          {contact.bounced && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
              <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-red-700 mb-0.5">Email bounced</p>
                <p className="text-xs text-red-600 leading-relaxed">This address was marked as bounced by AWS SES and is currently suppressed. Only reset if you are certain the address is valid.</p>
                <button
                  onClick={() => onResetBounce(contact.id)}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 border border-red-300 bg-white hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Mark as valid &amp; re-subscribe
                </button>
              </div>
            </div>
          )}

          {/* Personal info */}
          <section>
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Personal information</p>
            <div className="grid grid-cols-2 gap-3">
              {inp("First name", "first_name")}
              {inp("Last name", "last_name")}
              {inp("Phone number", "phone", "tel")}
              {inp("Alternate phone", "alternate_phone", "tel")}
              {inp("Company", "company")}
              {inp("Tax number", "tax_number")}
            </div>
          </section>

          {/* Address */}
          <section>
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Address</p>
            <div className="grid grid-cols-2 gap-3">
              {inp("Street address", "street_address")}
              {inp("Street number", "street_number")}
              {inp("Neighborhood", "neighborhood")}
              {inp("Postal code", "postal_code")}
              {inp("City", "city")}
              {inp("State / Province", "state_province")}
              <div className="col-span-2">
                <label className="text-xs font-medium text-zinc-500 block mb-1">Country</label>
                <select className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white" value={form.country} onChange={set("country")}>
                  <option value="">Select country</option>
                  {["India","United States","United Kingdom","Australia","Canada","Singapore","UAE","Germany","France","Netherlands","Other"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Account */}
          <section>
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Account</p>
            <div className="grid grid-cols-2 gap-3">
              {inp("User name", "user_name")}
              {inp("User type", "user_type")}
              <div className="col-span-2">
                <label className="text-xs font-medium text-zinc-500 block mb-1">Language</label>
                <select className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white" value={form.language} onChange={set("language")}>
                  {["English","Hindi","Marathi","Tamil","Telugu","Kannada","Bengali","Gujarati","Other"].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Agent info */}
          <section>
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Agent information</p>
            <div className="grid grid-cols-2 gap-3">
              {inp("Agent name", "agent_name")}
              {inp("Agent ID", "agent_id")}
              {inp("Agent registered date", "agent_registered_date", "date")}
              {inp("Agent PAN card no.", "agent_pancard_no")}
              <div className="col-span-2">{inp("Agent GST number", "agent_gst_number")}</div>
            </div>
          </section>

          {/* Tags */}
          <section>
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Tags</p>
            <TagMultiSelect allTags={allTags} value={tagIds} onChange={setTagIds} placeholder="Select tags…" />
            {tagIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tagIds.map(id => {
                  const tag = allTags.find(t => t.id === id)
                  if (!tag) return null
                  return (
                    <span key={id} className="inline-flex items-center gap-1 bg-teal-50 text-[#003434] border border-teal-200 text-xs px-2.5 py-0.5 rounded-full">
                      {tag.name}
                      <button type="button" onClick={() => setTagIds(prev => prev.filter(tid => tid !== id))} className="text-teal-400 hover:text-teal-600">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-zinc-100 px-5 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => { onClose(); onDelete(contact.id, contact.email) }}
            className="text-xs text-red-400 hover:text-red-600 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Delete contact
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors">Cancel</button>
            <button
              onClick={handleSave}
              disabled={busy}
              className="inline-flex items-center gap-1.5 bg-[#003434] text-white text-sm px-5 py-2 rounded-lg hover:bg-[#004444] disabled:opacity-40 transition-colors"
            >
              {busy && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Duplicate contact dialog ─────────────────────────────────────────────────

function DuplicateDialog({ type, existingCount, newCount, onSkip, onCancel, onAddToTag, addToTagBusy, hasImportTags }: {
  type: "create" | "import"
  existingCount: number
  newCount: number
  onSkip: () => void
  onCancel: () => void
  onAddToTag?: () => void
  addToTagBusy?: boolean
  hasImportTags?: boolean
}) {
  const isCreate = type === "create"
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-zinc-100">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-amber-100">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-sm font-semibold text-zinc-900">
              {isCreate ? "Contact already exists" : `${existingCount} duplicate${existingCount !== 1 ? "s" : ""} found`}
            </h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              {isCreate
                ? "This email address is already in your contacts list."
                : `${existingCount} contact${existingCount !== 1 ? "s" : ""} in this file already exist${existingCount === 1 ? "s" : ""} in your list.${newCount > 0 ? ` ${newCount} new contact${newCount !== 1 ? "s" : ""} will be added.` : " There are no new contacts to add."}`
              }
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 flex-wrap">
          <button
            className="text-sm px-4 py-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors"
            onClick={onCancel}
          >
            Cancel
          </button>
          {!isCreate && hasImportTags && onAddToTag && (
            <button
              className="text-sm px-4 py-2 rounded-lg border border-[#003434] text-[#003434] hover:bg-[#003434]/5 transition-colors disabled:opacity-50"
              onClick={onAddToTag}
              disabled={addToTagBusy}
            >
              {addToTagBusy ? "Adding…" : `Add tag to ${existingCount} existing`}
            </button>
          )}
          {(!isCreate && newCount > 0) && (
            <button
              className="text-sm px-4 py-2 rounded-lg bg-[#003434] text-white hover:bg-[#004848] transition-colors"
              onClick={onSkip}
            >
              Skip existing · add {newCount} new
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const { clientId } = useClient()

  // ── Shared data ──
  const [contacts, setContacts] = useState<Contact[]>([])
  const [totalContacts, setTotalContacts] = useState(0)
  const [allTags, setAllTags] = useState<EmailTag[]>([])
  const [lists, setLists] = useState<EmailList[]>([])
  const [importLogs, setImportLogs] = useState<ImportLog[]>([])
  const [loading, setLoading] = useState(true)

  // ── View router ──
  const [view, setView] = useState<View>("list")

  // ── List view state ──
  const [sidebarFilters, setSidebarFilters] = useState<SidebarFilters>(DEFAULT_FILTERS)
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<50 | 100 | 200>(50)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkTagOpen, setBulkTagOpen] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [openPillDropdown, setOpenPillDropdown] = useState<{ contactId: string; tag: EmailTag } | null>(null)
  const [openAddTag, setOpenAddTag] = useState<string | null>(null)
  const addTagBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const bulkTagRef = useRef<HTMLDivElement>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [drawerContact, setDrawerContact] = useState<Contact | null>(null)
  const [dupDialog, setDupDialog] = useState<{
    type: "create" | "import"
    existingCount: number
    newCount: number
    existingEmails: string[]
    onSkip: () => void
  } | null>(null)
  const [addToTagBusy, setAddToTagBusy] = useState(false)

  // ── Create view state ──
  const [createForm, setCreateForm] = useState({
    email: "", firstName: "", lastName: "", phone: "", alternatePhone: "",
    company: "", streetAddress: "", streetNumber: "", neighborhood: "",
    postalCode: "", city: "", stateProvince: "", country: "", taxNumber: "",
    language: "English", userName: "", userType: "", agentName: "", agentId: "",
    agentRegisteredDate: "", agentPancardNo: "", agentGstNumber: "",
    tagIds: [] as string[], customFields: [] as CustomField[],
  })
  const [createBusy, setCreateBusy] = useState(false)
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false)

  // ── Import view state ──
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importDelimiter, setImportDelimiter] = useState<"," | ";" | "|">(",")
  const [importTagIds, setImportTagIds] = useState<string[]>([])
  const [importTagSearch, setImportTagSearch] = useState("")
  const [importBusy, setImportBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Column mapping state ──
  const [importStep, setImportStep] = useState<"upload" | "map">("upload")
  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [columnMap, setColumnMap] = useState<Record<number, string>>({})
  const [csvEditMode, setCsvEditMode] = useState(false)
  const [csvEditRows, setCsvEditRows] = useState<string[][]>([])

  // ── Load saved filters from localStorage ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem("emozi-contact-filters")
      if (raw) setSavedFilters(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  // ── Data fetching ──
  const load = useCallback(() => {
    if (!clientId) { setContacts([]); setLoading(false); return }
    setLoading(true)
    fetch(`/api/email/contacts?client_id=${clientId}`)
      .then(r => r.json())
      .then(d => {
        setContacts(Array.isArray(d) ? d : (Array.isArray(d?.contacts) ? d.contacts : []))
        setTotalContacts(typeof d?.total === "number" ? d.total : (Array.isArray(d) ? d.length : 0))
      })
      .finally(() => setLoading(false))
  }, [clientId])

  const loadTags = useCallback(() => {
    if (!clientId) { setAllTags([]); return }
    fetch(`/api/email/tags?client_id=${clientId}`).then(r => r.json()).then(d => setAllTags(Array.isArray(d) ? d : []))
  }, [clientId])

  const loadImportLogs = useCallback(() => {
    if (!clientId) { setImportLogs([]); return }
    fetch(`/api/email/contacts/import-logs?client_id=${clientId}`).then(r => r.json()).then(d => setImportLogs(Array.isArray(d) ? d : []))
  }, [clientId])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadTags() }, [loadTags])
  useEffect(() => {
    if (!clientId) { setLists([]); return }
    fetch(`/api/email/lists?client_id=${clientId}`).then(r => r.json()).then(d => setLists(Array.isArray(d) ? d : []))
  }, [clientId])

  // Load import logs on client change and when switching to import view
  useEffect(() => { loadImportLogs() }, [loadImportLogs])
  useEffect(() => { if (view === "import") loadImportLogs() }, [view, loadImportLogs])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [sidebarFilters, pageSize])
  useEffect(() => { setSelected(new Set()) }, [sidebarFilters])

  // ── Filtered + paginated contacts ──
  const filteredContacts = useMemo(() => {
    const sf = sidebarFilters
    const m = (val: string | null | undefined, q: string) =>
      !q || (val ?? "").toLowerCase().includes(q.toLowerCase())
    return contacts.filter(c => {
      if (!m(c.email, sf.emailSearch)) return false
      if (!m(c.first_name, sf.firstName)) return false
      if (!m(c.last_name, sf.lastName)) return false
      if (!m(c.phone, sf.phone)) return false
      if (!m(c.company, sf.company)) return false
      if (!m(c.city, sf.city)) return false
      if (!m(c.state_province, sf.stateProvince)) return false
      if (!m(c.country, sf.country)) return false
      if (!m(c.agent_id, sf.agentId)) return false
      if (!m(c.user_type, sf.userType)) return false
      if (!m(c.agent_name, sf.agentName)) return false
      if (!m(c.user_name, sf.userName)) return false
      if (sf.language && c.language !== sf.language) return false
      if (sf.tagIds.length && !sf.tagIds.some(tid => c.tags.some(t => t.id === tid))) return false
      if (sf.dateFrom && new Date(c.created_at) < new Date(sf.dateFrom)) return false
      if (sf.dateTo && new Date(c.created_at) > new Date(sf.dateTo + "T23:59:59")) return false
      if (sf.status === "subscribed" && !c.subscribed) return false
      if (sf.status === "unsubscribed" && c.subscribed) return false
      if (sf.status === "bounced" && !c.bounced) return false
      if (sf.status === "complained" && !c.complained) return false
      return true
    })
  }, [contacts, sidebarFilters])

  const totalPages = Math.ceil(filteredContacts.length / pageSize)
  const paginatedContacts = filteredContacts.slice((page - 1) * pageSize, page * pageSize)
  const allSelected = paginatedContacts.length > 0 && paginatedContacts.every(c => selected.has(c.id))
  const someSelected = selected.size > 0

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleAll = () => { if (allSelected) setSelected(new Set()); else setSelected(new Set(paginatedContacts.map(c => c.id))) }

  // ── Saved filter management ──
  const handleSaveFilter = (pending: SidebarFilters) => {
    const label = prompt("Name this filter:")
    if (!label?.trim()) return
    const newFilter: SavedFilter = { id: Date.now().toString(), label: label.trim(), filters: { ...pending } }
    const next = [...savedFilters, newFilter]
    setSavedFilters(next)
    localStorage.setItem("emozi-contact-filters", JSON.stringify(next))
    toast.success("Filter saved")
  }

  const handleDeleteSavedFilter = (id: string) => {
    const next = savedFilters.filter(f => f.id !== id)
    setSavedFilters(next)
    localStorage.setItem("emozi-contact-filters", JSON.stringify(next))
  }

  // ── Handlers ──

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
    return data as EmailTag
  }

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
    toast.success(`Tagged ${selected.size} contact${selected.size !== 1 ? "s" : ""}`)
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

  // ── Create contact handler ──
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.email || !clientId) return

    // Check for duplicate before submitting
    const dupRes = await fetch("/api/email/contacts/check-duplicates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, emails: [createForm.email] }),
    })
    const dupData = await dupRes.json()
    if (dupData.existing?.length > 0) {
      setDupDialog({
        type: "create",
        existingCount: 1,
        newCount: 0,
        existingEmails: [createForm.email],
        onSkip: () => { setDupDialog(null) },
      })
      return
    }

    setCreateBusy(true)
    try {
      const name = [createForm.firstName, createForm.lastName].filter(Boolean).join(" ") || null
      // Build custom field metadata for dynamic columns
      const customMetadata: Record<string, string> = {}
      createForm.customFields.forEach(f => { if (f.value) customMetadata[f.key] = f.value })

      const payload = {
        client_id: clientId,
        email: createForm.email,
        name,
        first_name: createForm.firstName || null,
        last_name: createForm.lastName || null,
        phone: createForm.phone || null,
        alternate_phone: createForm.alternatePhone || null,
        company: createForm.company || null,
        street_address: createForm.streetAddress || null,
        street_number: createForm.streetNumber || null,
        neighborhood: createForm.neighborhood || null,
        postal_code: createForm.postalCode || null,
        city: createForm.city || null,
        state_province: createForm.stateProvince || null,
        country: createForm.country || null,
        tax_number: createForm.taxNumber || null,
        language: createForm.language || "English",
        user_name: createForm.userName || null,
        user_type: createForm.userType || null,
        agent_name: createForm.agentName || null,
        agent_id: createForm.agentId || null,
        agent_registered_date: createForm.agentRegisteredDate || null,
        agent_pancard_no: createForm.agentPancardNo || null,
        agent_gst_number: createForm.agentGstNumber || null,
        tag_ids: createForm.tagIds,
        metadata: customMetadata,
      }

      const res = await fetch("/api/email/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Contact created")
      // Optimistically prepend the new contact (with tags) so it shows immediately
      const newContact: Contact = { ...data, tags: data.tags ?? [] }
      setContacts(prev => [newContact, ...prev])
      setCreateForm({
        email: "", firstName: "", lastName: "", phone: "", alternatePhone: "",
        company: "", streetAddress: "", streetNumber: "", neighborhood: "",
        postalCode: "", city: "", stateProvince: "", country: "", taxNumber: "",
        language: "English", userName: "", userType: "", agentName: "", agentId: "",
        agentRegisteredDate: "", agentPancardNo: "", agentGstNumber: "",
        tagIds: [], customFields: [],
      })
      setView("list")
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Error") }
    finally { setCreateBusy(false) }
  }

  // ── Import handler (upload step → parse CSV + advance to map step) ──
  const handleImport = async () => {
    if (!importFile) { toast.error("Select a CSV file"); return }
    const text = await importFile.text()
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) { toast.error("CSV must have a header row + at least one data row"); return }
    const headers = lines[0].split(importDelimiter).map(h => h.replace(/^"|"$/g, "").trim())
    const dataRows = lines.slice(1, 5).map(l => l.split(importDelimiter).map(c => c.replace(/^"|"$/g, "").trim()))
    const auto: Record<number, string> = {}
    headers.forEach((h, i) => { const k = autoDetectField(h); if (k) auto[i] = k })
    setCsvPreview({ headers, rows: dataRows })
    setCsvEditRows(dataRows)
    setColumnMap(auto)
    setCsvEditMode(false)
    setImportStep("map")
  }

  // ── Actual import call (called after duplicate check is resolved) ──
  const doImport = async (skipExisting: boolean) => {
    if (!importFile || !clientId) return
    setImportBusy(true)
    try {
      const fd = new FormData()
      fd.append("client_id", clientId)
      fd.append("file", importFile)
      fd.append("delimiter", importDelimiter)
      fd.append("column_map", JSON.stringify(columnMap))
      fd.append("skip_existing", skipExisting ? "true" : "false")
      importTagIds.forEach(id => fd.append("tag_id", id))
      const res = await fetch("/api/email/contacts/import", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const parts = [`Imported ${data.imported} contact${data.imported !== 1 ? "s" : ""}`]
      if (data.skipped) parts.push(`${data.skipped} existing skipped`)
      if (data.invalid) parts.push(`${data.invalid} invalid skipped`)
      toast.success(parts.join(" · "))
      setImportFile(null)
      if (fileRef.current) fileRef.current.value = ""
      setImportTagIds([])
      setImportStep("upload")
      setCsvPreview(null)
      setColumnMap({})
      setCsvEditMode(false)
      loadImportLogs()
      load()
      setView("list")
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Import error") }
    finally { setImportBusy(false) }
  }

  // ── Mapped import handler (map step → duplicate check → actual import) ──
  const handleMappedImport = async () => {
    if (!importFile || !clientId) return
    const hasEmail = Object.values(columnMap).includes("email")
    if (!hasEmail) { toast.error("Please map a column to Email before importing"); return }

    // Parse all emails from the full CSV to check for duplicates
    const text = await importFile.text()
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
    const headers = lines[0].split(importDelimiter).map(h => h.replace(/^"|"$/g, "").trim())
    const emailColIdx = Object.entries(columnMap).find(([, v]) => v === "email")?.[0]
    const emailIdx = emailColIdx !== undefined ? Number(emailColIdx) : headers.findIndex(h => h.toLowerCase() === "email")
    const allEmails = lines.slice(1)
      .map(l => l.split(importDelimiter).map(c => c.replace(/^"|"$/g, "").trim())[emailIdx]?.toLowerCase().trim())
      .filter(e => e && e.includes("@"))
    const uniqueEmails = Array.from(new Set(allEmails))

    // Check for existing contacts in batches of 500
    const existingEmails: string[] = []
    const CHUNK = 500
    for (let i = 0; i < uniqueEmails.length; i += CHUNK) {
      const chunk = uniqueEmails.slice(i, i + CHUNK)
      const res = await fetch("/api/email/contacts/check-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, emails: chunk }),
      })
      const data = await res.json()
      existingEmails.push(...(data.existing ?? []))
    }

    if (existingEmails.length > 0) {
      setDupDialog({
        type: "import",
        existingCount: existingEmails.length,
        newCount: uniqueEmails.length - existingEmails.length,
        existingEmails,
        onSkip: () => { setDupDialog(null); doImport(true) },
      })
      return
    }

    doImport(false)
  }

  // ── Add tag to existing duplicates ──
  const handleAddToTag = async () => {
    if (!dupDialog || !clientId || !importTagIds.length) return
    setAddToTagBusy(true)
    try {
      const res = await fetch("/api/email/contacts/bulk-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, emails: dupDialog.existingEmails, tag_ids: importTagIds }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      // Update local state: add tags to affected contacts
      const tagsToAdd = allTags.filter(t => importTagIds.includes(t.id))
      setContacts(prev => prev.map(c => {
        if (!dupDialog.existingEmails.includes(c.email)) return c
        const existing = new Set(c.tags.map(t => t.id))
        const merged = [...c.tags, ...tagsToAdd.filter(t => !existing.has(t.id))]
        return { ...c, tags: merged }
      }))
      toast.success(`Tag${importTagIds.length > 1 ? "s" : ""} added to ${json.tagged} contact${json.tagged !== 1 ? "s" : ""}`)
      setDupDialog(null)
      // If there are new contacts to add too, proceed with import
      if (dupDialog.newCount > 0) doImport(true)
    } finally {
      setAddToTagBusy(false)
    }
  }

  // ── Drawer save handler ──
  const handleResetBounce = async (id: string) => {
    const res = await fetch(`/api/email/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset_bounce: true }),
    })
    if (!res.ok) { toast.error("Failed to reset bounce"); return }
    setContacts(prev => prev.map(c => c.id === id ? { ...c, bounced: false, subscribed: true } : c))
    setDrawerContact(prev => prev ? { ...prev, bounced: false, subscribed: true } : null)
    toast.success("Bounce cleared — contact re-subscribed")
  }

  const handleDrawerSave = async (id: string, fields: Record<string, unknown>, newTagIds: string[]) => {
    const res = await fetch(`/api/email/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    })
    if (!res.ok) { toast.error("Failed to save"); return }

    // Sync tags: add new, remove dropped
    const contact = contacts.find(c => c.id === id)
    if (contact) {
      const currentTagIds = contact.tags.map(t => t.id)
      const toAdd = newTagIds.filter(tid => !currentTagIds.includes(tid))
      const toRemove = currentTagIds.filter(tid => !newTagIds.includes(tid))
      await Promise.all([
        ...toAdd.map(tid => fetch(`/api/email/contacts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ add_tag_id: tid }) })),
        ...toRemove.map(tid => fetch(`/api/email/contacts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ remove_tag_id: tid }) })),
      ])
      const updatedTags = allTags.filter(t => newTagIds.includes(t.id))
      setContacts(prev => prev.map(c => c.id === id ? { ...c, ...fields, tags: updatedTags } : c))
    }
    setDrawerContact(prev => prev ? { ...prev, ...fields, tags: allTags.filter(t => newTagIds.includes(t.id)) } : null)
    toast.success("Contact updated")
  }

  // ── Status badge helper ──
  const statusBadge = (c: Contact) => {
    if (c.bounced) return <span className="inline-flex items-center gap-1 text-[11px] bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />bounced</span>
    if (c.complained) return <span className="inline-flex items-center gap-1 text-[11px] bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />complained</span>
    if (c.subscribed) return <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-[#70BF4B] inline-block" />subscribed</span>
    return <span className="inline-flex items-center gap-1 text-[11px] bg-zinc-100 text-zinc-500 border border-zinc-200 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-zinc-400 inline-block" />unsubscribed</span>
  }

  // ─── View: Create Contact ───────────────────────────────────────────────────

  if (view === "create") {
    return (
      <div className="w-full">
        {dialog && <ConfirmDialog {...dialog} onCancel={() => setDialog(null)} />}
        {dupDialog && <DuplicateDialog {...dupDialog} onCancel={() => setDupDialog(null)} onAddToTag={handleAddToTag} addToTagBusy={addToTagBusy} hasImportTags={importTagIds.length > 0} />}
        {showCustomFieldModal && (
          <CustomFieldModal
            onClose={() => setShowCustomFieldModal(false)}
            onSave={field => {
              setCreateForm(f => ({ ...f, customFields: [...f.customFields, field] }))
              setShowCustomFieldModal(false)
            }}
          />
        )}

        {/* Breadcrumb header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => setView("list")} className="text-zinc-500 hover:text-zinc-800 transition-colors">Contacts</button>
            <svg className="w-3.5 h-3.5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            <span className="text-zinc-900 font-semibold">Create contact</span>
          </div>
          <button
            form="create-contact-form"
            type="submit"
            disabled={createBusy || !createForm.email}
            className="inline-flex items-center gap-1.5 bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] disabled:opacity-40 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            {createBusy ? "Saving…" : "Save"}
          </button>
        </div>

        <form id="create-contact-form" onSubmit={handleCreate}>
          <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-5">
            {/* Helper to render a labeled input */}
            {(() => {
              const f = createForm
              const set = (key: keyof typeof createForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
                setCreateForm(prev => ({ ...prev, [key]: e.target.value }))
              const inp = (label: string, key: keyof typeof createForm, opts?: { type?: string; placeholder?: string; required?: boolean; colSpan?: boolean }) => (
                <div className={opts?.colSpan ? "col-span-2" : ""}>
                  <label className="text-sm font-medium text-zinc-700 block mb-1.5">
                    {label}{opts?.required && <span className="text-red-400 ml-0.5">*</span>}
                  </label>
                  <input
                    type={opts?.type ?? "text"}
                    required={opts?.required}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
                    placeholder={opts?.placeholder ?? label}
                    value={f[key] as string}
                    onChange={set(key)}
                  />
                </div>
              )
              return (
                <div className="grid grid-cols-2 gap-4">
                  {inp("Email", "email", { type: "email", placeholder: "email@example.com", required: true, colSpan: true })}
                  {inp("First name", "firstName")}
                  {inp("Last name", "lastName")}
                  {inp("Street address", "streetAddress")}
                  {inp("Street number", "streetNumber")}
                  {inp("Neighborhood", "neighborhood")}
                  {inp("Postal code", "postalCode")}
                  {inp("City", "city")}
                  {inp("State / Province", "stateProvince")}
                  <div>
                    <label className="text-sm font-medium text-zinc-700 block mb-1.5">Country</label>
                    <select
                      className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white"
                      value={f.country}
                      onChange={set("country")}
                    >
                      <option value="">Country</option>
                      {["India","United States","United Kingdom","Australia","Canada","Singapore","UAE","Germany","France","Netherlands","Other"].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  {inp("Phone number", "phone", { type: "tel", placeholder: "+91 98765 43210" })}
                  {inp("Company name", "company")}
                  {inp("Tax number", "taxNumber")}
                  {inp("Alternate Mobile No", "alternatePhone", { type: "tel" })}
                  {inp("Agent Pancard No", "agentPancardNo")}
                  {inp("Agent GST Number", "agentGstNumber")}
                  {inp("Agent Id", "agentId")}
                  {inp("Agent Registered Date", "agentRegisteredDate", { type: "date" })}
                  {inp("User Type", "userType")}
                  {inp("Agent Name", "agentName")}
                  {inp("User Name", "userName")}
                  <div>
                    <label className="text-sm font-medium text-zinc-700 block mb-1.5">Language <span className="text-red-400">*</span></label>
                    <select
                      className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white"
                      value={f.language}
                      onChange={set("language")}
                    >
                      {["English","Hindi","Marathi","Tamil","Telugu","Kannada","Bengali","Gujarati","Other"].map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )
            })()}

            {/* Dynamic custom fields */}
            {createForm.customFields.length > 0 && (
              <div className="border-t border-zinc-100 pt-4 grid grid-cols-2 gap-4">
                {createForm.customFields.map((field, idx) => (
                  <div key={field.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-zinc-700">{field.label}</label>
                      <button
                        type="button"
                        onClick={() => setCreateForm(f => ({ ...f, customFields: f.customFields.filter((_, i) => i !== idx) }))}
                        className="text-zinc-300 hover:text-red-400 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                    <input
                      className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
                      placeholder={field.label}
                      value={field.value}
                      onChange={e => setCreateForm(f => ({
                        ...f,
                        customFields: f.customFields.map((cf, i) => i === idx ? { ...cf, value: e.target.value } : cf)
                      }))}
                    />
                  </div>
                ))}
              </div>
            )}

            <button type="button" onClick={() => setShowCustomFieldModal(true)} className="inline-flex items-center gap-2 text-sm text-[#003434] hover:underline">
              <span className="w-5 h-5 rounded-full bg-[#003434] text-white flex items-center justify-center">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              </span>
              Add new custom field
            </button>
          </div>

          {/* Tags */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6 mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-700">Select tags</h3>
              <button type="button" onClick={() => setCreateForm(f => ({ ...f, tagIds: [] }))} className="text-xs text-zinc-400 hover:text-zinc-600">Discard changes</button>
            </div>
            <TagMultiSelect allTags={allTags} value={createForm.tagIds} onChange={v => setCreateForm(f => ({ ...f, tagIds: v }))} placeholder="Search and select tags…" />
            {createForm.tagIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {createForm.tagIds.map(id => {
                  const tag = allTags.find(t => t.id === id)
                  if (!tag) return null
                  return (
                    <span key={id} className="inline-flex items-center gap-1.5 bg-teal-50 text-[#003434] border border-teal-200 text-xs px-3 py-1 rounded-full">
                      {tag.name}
                      <button type="button" onClick={() => setCreateForm(f => ({ ...f, tagIds: f.tagIds.filter(tid => tid !== id) }))} className="text-teal-400 hover:text-teal-600">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </form>
      </div>
    )
  }

  // ─── View: Import ───────────────────────────────────────────────────────────

  if (view === "import") {
    const filteredImportTags = importTagSearch.trim()
      ? allTags.filter(t => t.name.toLowerCase().includes(importTagSearch.toLowerCase()))
      : allTags

    const resetImportState = () => {
      setImportStep("upload")
      setCsvPreview(null)
      setColumnMap({})
      setCsvEditMode(false)
    }

    return (
      <div className="w-full">
        {dupDialog && <DuplicateDialog {...dupDialog} onCancel={() => setDupDialog(null)} onAddToTag={handleAddToTag} addToTagBusy={addToTagBusy} hasImportTags={importTagIds.length > 0} />}
        {/* Back button */}
        <button onClick={() => { resetImportState(); setView("list") }} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Contacts
        </button>

        {/* Column mapping step */}
        {importStep === "map" && csvPreview && (
          <ColumnMappingStep
            csvPreview={csvPreview}
            columnMap={columnMap}
            onMapChange={(colIdx, fieldKey) => setColumnMap(prev => ({ ...prev, [colIdx]: fieldKey }))}
            csvEditMode={csvEditMode}
            csvEditRows={csvEditRows}
            onEditRowChange={(rowIdx, colIdx, val) => setCsvEditRows(prev => prev.map((r, ri) => ri === rowIdx ? r.map((c, ci) => ci === colIdx ? val : c) : r))}
            onToggleEditMode={() => setCsvEditMode(v => !v)}
            onPrevious={() => setImportStep("upload")}
            onImport={handleMappedImport}
            importBusy={importBusy}
          />
        )}

        {/* Upload step */}
        {importStep === "upload" && (<>

        <div className="grid lg:grid-cols-5 gap-5 mb-6">
          {/* Warnings panel */}
          <div className="lg:col-span-2">
            <ImportWarningsPanel />
          </div>

          {/* Import form */}
          <div className="lg:col-span-3 space-y-4">
            {/* Contacts to import */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-zinc-700 mb-4">Contacts to import</h3>
              <div className="mb-4">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2 block">Select CSV delimiter</label>
                <div className="flex gap-0">
                  {([",", ";", "|"] as const).map((d, i) => {
                    const labels = { ",": "Comma", ";": "Semicolon", "|": "Pipe" }
                    const active = importDelimiter === d
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setImportDelimiter(d)}
                        className={`flex-1 py-2 text-sm border transition-colors ${
                          i === 0 ? "rounded-l-lg" : i === 2 ? "rounded-r-lg" : ""
                        } ${
                          active
                            ? "bg-[#003434] text-white border-[#003434]"
                            : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                        }`}
                      >
                        {labels[d]}
                        {active && (
                          <svg className="w-3 h-3 inline ml-1.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div
                className="border-2 border-dashed border-zinc-200 rounded-xl p-8 text-center hover:border-[#003434]/40 transition-colors cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                {importFile ? (
                  <div>
                    <svg className="w-8 h-8 text-[#70BF4B] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-sm font-medium text-zinc-700">{importFile.name}</p>
                    <button type="button" onClick={e => { e.stopPropagation(); setImportFile(null); if (fileRef.current) fileRef.current.value = "" }} className="text-xs text-zinc-400 hover:text-red-400 mt-1 transition-colors">Remove</button>
                  </div>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-zinc-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    <p className="text-sm text-zinc-500">Click to select the CSV file that contains your contacts</p>
                    <p className="text-xs text-zinc-400 mt-1">Ensure that the first row contains column names</p>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => setImportFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>

            {/* Select tags */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-700">Select tags</h3>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setImportTagIds([])} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">Discard changes</button>
                  <button
                    type="button"
                    onClick={async () => {
                      const name = prompt("Tag name:")
                      if (name?.trim()) await handleCreateTag(name.trim())
                    }}
                    className="text-xs bg-[#003434] text-white px-3 py-1.5 rounded-lg hover:bg-[#004444] transition-colors"
                  >
                    Create a new tag
                  </button>
                </div>
              </div>
              <div className="relative mb-3">
                <svg className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input className="w-full border border-zinc-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Search" value={importTagSearch} onChange={e => setImportTagSearch(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                {filteredImportTags.map(tag => {
                  const selected = importTagIds.includes(tag.id)
                  return (
                    <button
                      key={tag.id} type="button"
                      onClick={() => setImportTagIds(prev => selected ? prev.filter(id => id !== tag.id) : [...prev, tag.id])}
                      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        selected ? "bg-[#003434] text-white border-[#003434]" : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      {tag.name}
                      {selected && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      )}
                    </button>
                  )
                })}
                {filteredImportTags.length === 0 && <p className="text-xs text-zinc-400">No tags found</p>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setView("list")} className="text-sm px-4 py-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors">
                Previous
              </button>
              <button type="button" onClick={handleImport} disabled={importBusy || !importFile} className="inline-flex items-center gap-2 bg-[#003434] text-white text-sm px-5 py-2 rounded-lg hover:bg-[#004444] disabled:opacity-40 transition-colors">
                {importBusy ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Next
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Previous imports */}
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-700">Previous imports</h3>
          </div>
          {importLogs.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-zinc-400">No previous imports</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-zinc-500 tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-zinc-500 tracking-wider">Registered</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-zinc-500 tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-zinc-500 tracking-wider flex items-center gap-1">
                    Invalid data
                    <span className="w-3.5 h-3.5 rounded-full bg-zinc-200 text-zinc-500 inline-flex items-center justify-center text-[9px] font-bold shrink-0">?</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {importLogs.map(log => (
                  <tr key={log.id} className="border-b border-zinc-50 hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3.5 text-xs text-zinc-600 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })},&nbsp;
                      {new Date(log.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-zinc-600">{log.imported}/{log.total_rows}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs ${log.status === "completed" ? "text-zinc-700" : "text-red-500"}`}>
                        {log.status === "completed" ? "Approved" : "Failed"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      {log.invalid > 0
                        ? <span className="text-[#003434] hover:underline cursor-pointer">Download {log.invalid} invalid rows</span>
                        : <span className="text-zinc-400">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        </>)}
      </div>
    )
  }

  // ─── View: List (default) ───────────────────────────────────────────────────

  return (
    <div className="w-full">
      {dialog && <ConfirmDialog {...dialog} onCancel={() => setDialog(null)} />}
      {dupDialog && <DuplicateDialog {...dupDialog} onCancel={() => setDupDialog(null)} onAddToTag={handleAddToTag} addToTagBusy={addToTagBusy} hasImportTags={importTagIds.length > 0} />}
      {drawerContact && (
        <ContactDrawer
          contact={drawerContact}
          allTags={allTags}
          onClose={() => setDrawerContact(null)}
          onSave={handleDrawerSave}
          onDelete={(id, email) => { setDrawerContact(null); handleDelete(id, email) }}
          onResetBounce={handleResetBounce}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-zinc-900">
          {contacts.length > 0 ? `${contacts.length.toLocaleString()} Contacts` : (totalContacts > 0 ? `${totalContacts.toLocaleString()} Contacts` : "Contacts")}
        </h1>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setView("create")}
            className="inline-flex items-center gap-1.5 bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Create contact
          </button>
          <button
            onClick={() => setView("import")}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20H5a2 2 0 01-2-2V6a2 2 0 012-2h4l2 3h8a2 2 0 012 2v9a2 2 0 01-2 2z" /></svg>
            Import contacts
          </button>
        </div>
      </div>

      <div className="flex gap-5 items-start">
        {/* Sidebar */}
        <div className="w-[240px] shrink-0">
          <SidebarFilters
            filters={sidebarFilters}
            allTags={allTags}
            onChange={f => setSidebarFilters(f)}
            savedFilters={savedFilters}
            onSave={handleSaveFilter}
            onLoadFilter={f => { setSidebarFilters(f.filters); setPage(1) }}
            onDeleteFilter={handleDeleteSavedFilter}
            onReset={() => { setSidebarFilters(DEFAULT_FILTERS); setPage(1) }}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Bulk action bar */}
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

          {/* Table */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            {loading ? (
              <div className="px-4 py-12 text-center">
                <div className="inline-block w-5 h-5 border-2 border-zinc-200 border-t-[#003434] rounded-full animate-spin" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <svg className="w-10 h-10 text-zinc-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20H5a2 2 0 01-2-2V6a2 2 0 012-2h4l2 3h8a2 2 0 012 2v9a2 2 0 01-2 2z" /></svg>
                <p className="text-sm text-zinc-400">No contacts found</p>
                <button onClick={() => setSidebarFilters(DEFAULT_FILTERS)} className="text-xs text-[#003434] hover:underline mt-1">Clear filters</button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/60">
                    <th className="px-4 py-3 w-8">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3.5 h-3.5 rounded border-zinc-300 cursor-pointer accent-[#003434]" />
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Date registered</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Email address</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Phone number</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Tags</th>
                    <th className="px-4 py-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {paginatedContacts.map(c => {
                    const isChecked = selected.has(c.id)
                    return (
                      <tr key={c.id} className={`border-b border-zinc-50 transition-colors ${isChecked ? "bg-teal-50/40" : "hover:bg-zinc-50/50"}`}>
                        <td className="px-4 py-3.5 w-8">
                          <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(c.id)} className="w-3.5 h-3.5 rounded border-zinc-300 cursor-pointer accent-[#003434]" />
                        </td>
                        <td className="px-4 py-3.5 text-xs text-zinc-500 whitespace-nowrap">
                          {new Date(c.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })},&nbsp;
                          {new Date(c.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            className="flex items-center gap-2 text-left group"
                            onClick={() => setDrawerContact(c)}
                          >
                            <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 shrink-0 group-hover:bg-teal-50 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-[#003434] group-hover:underline">{c.email}</p>
                              {(c.first_name || c.last_name) && (
                                <p className="text-[11px] text-zinc-400">{[c.first_name, c.last_name].filter(Boolean).join(" ")}</p>
                              )}
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-zinc-500 whitespace-nowrap">
                          {c.phone ?? <span className="text-zinc-300">—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap items-center gap-1">
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
                            <button
                              ref={el => { if (el) addTagBtnRefs.current.set(c.id, el); else addTagBtnRefs.current.delete(c.id) }}
                              className="w-5 h-5 flex items-center justify-center text-zinc-300 hover:text-[#003434] border border-dashed border-zinc-200 hover:border-teal-300 rounded-full transition-colors"
                              title="Add/remove tags"
                              onClick={() => setOpenAddTag(openAddTag === c.id ? null : c.id)}
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            </button>
                            {openAddTag === c.id && addTagBtnRefs.current.get(c.id) && (
                              <AddTagPopover
                                contactId={c.id}
                                clientId={clientId}
                                allTags={allTags}
                                contactTags={c.tags}
                                anchorRef={{ current: addTagBtnRefs.current.get(c.id)! }}
                                onApply={handleApplyTags}
                                onNewTag={tag => setAllTags(prev => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))}
                                onClose={() => setOpenAddTag(null)}
                              />
                            )}
                            {/* Status badge alongside tags */}
                            {statusBadge(c)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <RowActions
                            contact={c}
                            onToggleSubscribe={() => handleToggleSubscribe(c.id, c.subscribed)}
                            onDelete={() => handleDelete(c.id, c.email)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {filteredContacts.length > 0 && (
            <div className="flex items-center justify-between mt-3 px-1">
              <div className="flex items-center gap-1">
                <span className="text-xs text-zinc-400 mr-2">Rows per page:</span>
                {([50, 100, 200] as const).map(n => (
                  <button key={n} onClick={() => { setPageSize(n); setPage(1) }}
                    className={`w-8 h-8 text-xs rounded-lg transition-colors ${pageSize === n ? "bg-[#003434] text-white" : "text-zinc-500 hover:bg-zinc-100"}`}>
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredContacts.length)} of {filteredContacts.length}</span>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
