/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useRef, useEffect } from "react"
import { useClientUpdate } from "@/lib/useClientUpdate"

export function SaveIndicator({ saving, saved, error }: { saving: boolean; saved: boolean; error: boolean }) {
  if (saving) return <span className="text-zinc-500 text-[10px] animate-pulse whitespace-nowrap">Saving…</span>
  if (saved) return <span className="text-[#70BF4B] font-bold text-xs whitespace-nowrap">✓</span>
  if (error) return <span className="text-red-500 text-[10px] whitespace-nowrap">Error</span>
  return null
}

export function EField({
  clientId, label, value, field, section, inputType = "text", onCustomSave,
}: {
  clientId: string; label: string; value: string; field: string; section?: string; inputType?: string;
  onCustomSave?: (v: string, updateFn: (s: string, v: unknown) => void) => void;
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [local, setLocal] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const { update, saving, saved, error } = useClientUpdate(clientId)

  useEffect(() => setLocal(value), [value])
  useEffect(() => { if (isEditing) inputRef.current?.focus() }, [isEditing])

  function handleSave() {
    setIsEditing(false)
    if (String(local) !== String(value)) {
      if (onCustomSave) onCustomSave(local, update)
      else if (section) update(section, { [field]: local })
      else update(field, local)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave()
    if (e.key === "Escape") { setLocal(value); setIsEditing(false) }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-1.5 py-3 border-b border-[#003434] last:border-0 relative">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:w-40 shrink-0 pt-0.5 mt-[2px]">{label}</dt>
      <dd className="flex-1 min-w-0 pr-6">
        {inputType === "checkbox" ? (
          <input type="checkbox" className="accent-[#70BF4B] w-4 h-4 mt-1"
            checked={local === "true" || local === true as unknown}
            onChange={e => {
              const val = e.target.checked
              setLocal(val as unknown as string)
              if (onCustomSave) onCustomSave(String(val), update)
              else if (section) update(section, { [field]: val })
              else update(field, val)
            }} />
        ) : inputType === "color" ? (
          <div className="flex items-center gap-2">
            {local && <div className="w-5 h-5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: local }} />}
            <div onClick={() => setIsEditing(true)} className="text-sm text-zinc-200 cursor-text hover:bg-white/5 rounded px-2 py-1 transition-colors">{local || <span className="text-zinc-600 italic text-xs">Click to edit</span>}</div>
          </div>
        ) : isEditing ? (
          <input ref={inputRef} type={inputType} value={local}
            onChange={e => setLocal(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown}
            className="w-full bg-[#001f1f] text-white text-sm outline-none border border-[#70BF4B]/50 rounded-lg px-2 py-1" />
        ) : (
          <div onClick={() => setIsEditing(true)} className="w-full text-sm text-zinc-200 cursor-text hover:bg-white/5 rounded-lg border border-transparent px-2 py-1 -ml-2 transition-colors min-h-[30px] flex items-center">
            {local || <span className="text-zinc-600 italic text-xs">Click to edit</span>}
          </div>
        )}
      </dd>
      <div className="absolute right-0 top-3"><SaveIndicator saving={saving} saved={saved} error={error} /></div>
    </div>
  )
}

export function ESelect({
  clientId, label, value, field, section, options, onCustomSave,
}: {
  clientId: string; label: string; value: string; field: string; section?: string; options: string[];
  onCustomSave?: (v: string, u: any) => void;
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [local, setLocal] = useState(value)
  const { update, saving, saved, error } = useClientUpdate(clientId)

  useEffect(() => setLocal(value), [value])

  function handleSave(newVal: string) {
    setLocal(newVal); setIsEditing(false)
    if (String(newVal) !== String(value)) {
      if (onCustomSave) onCustomSave(newVal, update)
      else if (section) update(section, { [field]: newVal })
      else update(field, newVal)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-1.5 py-3 border-b border-[#003434] last:border-0 relative">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:w-40 shrink-0 pt-0.5 mt-[2px]">{label}</dt>
      <dd className="flex-1 min-w-0 pr-6">
        {isEditing ? (
          <select autoFocus value={local} onChange={e => handleSave(e.target.value)} onBlur={() => setIsEditing(false)}
            className="w-full bg-[#001f1f] text-white text-sm outline-none border border-[#70BF4B]/50 rounded-lg px-2 py-1">
            <option value="">Select…</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <div onClick={() => setIsEditing(true)} className="w-full text-sm text-zinc-200 cursor-pointer hover:bg-white/5 rounded-lg px-2 py-1 -ml-2 transition-colors min-h-[30px] flex items-center">
            {local || <span className="text-zinc-600 italic text-xs">Click to select</span>}
          </div>
        )}
      </dd>
      <div className="absolute right-0 top-3"><SaveIndicator saving={saving} saved={saved} error={error} /></div>
    </div>
  )
}

export function ETextarea({
  clientId, label, value, field, section, onCustomSave, placeholder,
}: {
  clientId: string; label: string; value: string; field: string; section?: string;
  onCustomSave?: (v: string, u: any) => void; placeholder?: string;
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [local, setLocal] = useState(value)
  const { update, saving, saved, error } = useClientUpdate(clientId)

  useEffect(() => setLocal(value), [value])

  function handleSave() {
    setIsEditing(false)
    if (String(local) !== String(value)) {
      if (onCustomSave) onCustomSave(local, update)
      else if (section) update(section, { [field]: local })
      else update(field, local)
    }
  }

  return (
    <div className="space-y-1.5 py-2 border-b border-[#003434] last:border-0">
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</label>
        <SaveIndicator saving={saving} saved={saved} error={error} />
      </div>
      {isEditing ? (
        <textarea autoFocus value={local} rows={4} onChange={e => setLocal(e.target.value)} onBlur={handleSave}
          className="w-full bg-[#001f1f] border border-[#70BF4B]/50 text-zinc-200 text-sm rounded-xl px-4 py-3 outline-none resize-none placeholder-zinc-700"
          placeholder={placeholder || "Type here…"} />
      ) : (
        <div onClick={() => setIsEditing(true)}
          className="w-full bg-transparent border border-transparent hover:border-[#003434] hover:bg-white/5 text-zinc-200 text-sm rounded-xl px-4 py-3 cursor-text min-h-[80px] whitespace-pre-wrap transition-colors">
          {local || <span className="text-zinc-600 italic">Click to edit…</span>}
        </div>
      )}
    </div>
  )
}

export function ETagList({ label, value }: { label: string; value: string[] | string }) {
  const tags = Array.isArray(value) ? value : (typeof value === "string" && value ? value.split(",").map(t => t.trim()) : [])
  return (
    <div className="flex flex-col sm:flex-row gap-1.5 py-3 border-b border-[#003434] last:border-0">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:w-40 shrink-0 pt-0.5">{label}</dt>
      <dd className="flex-1 min-w-0 flex flex-wrap gap-1.5">
        {tags.length > 0
          ? tags.map((t, i) => <span key={i} className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border bg-[#003434]/60 text-zinc-300 border-[#70BF4B]/20">{t}</span>)
          : <span className="text-zinc-600 text-xs italic">—</span>}
      </dd>
    </div>
  )
}

export function EMultiSelect({
  clientId, label, value, field, section, options,
}: {
  clientId: string; label: string; value: string[] | string; field: string; section?: string; options: string[];
}) {
  const [isEditing, setIsEditing] = useState(false)
  const currentTags = Array.isArray(value) ? value : (typeof value === "string" && value ? value.split(",").map(t => t.trim()) : [])
  const { update, saving, saved, error } = useClientUpdate(clientId)

  function toggleTag(tag: string) {
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag]
    
    if (section) update(section, { [field]: newTags })
    else update(field, newTags)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-1.5 py-3 border-b border-[#003434] last:border-0 relative">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:w-40 shrink-0 pt-0.5 mt-[2px]">{label}</dt>
      <dd className="flex-1 min-w-0 pr-6">
        <div className="flex flex-wrap gap-1.5 min-h-[30px] items-center">
          {currentTags.map((t, i) => (
            <span key={i} className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border bg-[#70BF4B]/10 text-[#70BF4B] border-[#70BF4B]/30">
              {t}
            </span>
          ))}
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors px-2 py-0.5 rounded border border-dashed border-zinc-700"
          >
            {isEditing ? "Close" : "+ Edit Tags"}
          </button>
        </div>
        
        {isEditing && (
          <div className="mt-3 p-3 bg-[#001f1f] border border-[#003434] rounded-xl flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {options.map(o => {
              const active = currentTags.includes(o)
              return (
                <button
                  key={o}
                  onClick={() => toggleTag(o)}
                  className={`px-3 py-1 rounded-lg text-xs transition-all ${
                    active 
                      ? "bg-[#70BF4B] text-[#001a1a] font-semibold shadow-lg shadow-[#70BF4B]/20" 
                      : "bg-[#003434] text-zinc-400 border border-transparent hover:border-zinc-700"
                  }`}
                >
                  {o}
                </button>
              )
            })}
          </div>
        )}
      </dd>
      <div className="absolute right-0 top-3"><SaveIndicator saving={saving} saved={saved} error={error} /></div>
    </div>
  )
}

export function SectionCard({ title, accent = "#70BF4B", isDone, children }: { title: string; accent?: string; isDone?: boolean; children: React.ReactNode }) {
  return (
    <div className="bg-[#001a1a]/80 border border-[#003434] rounded-xl overflow-hidden shadow-sm h-fit">
      <div className="px-5 py-3 border-b border-[#003434] flex items-center justify-between bg-[#001f1f]">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
          <h3 className="text-white text-sm font-semibold">{title}</h3>
        </div>
        {isDone !== undefined && (
          isDone ? (
            <span className="text-[#70BF4B] text-[10px] font-bold uppercase tracking-wider bg-[#70BF4B]/10 px-2 py-0.5 rounded-full">Done</span>
          ) : (
            <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-wider border border-zinc-700 px-2 py-0.5 rounded-full">Pending</span>
          )
        )}
      </div>
      <dl className="px-5 py-1">{children}</dl>
    </div>
  )
}
