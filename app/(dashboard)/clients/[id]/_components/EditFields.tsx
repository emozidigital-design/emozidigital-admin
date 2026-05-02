/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useRef, useEffect } from "react"
import { useClientUpdate } from "@/lib/useClientUpdate"

export type Opt = { value: string; label: string }

// Normalize either string[] or Opt[] into a uniform Opt[]
function normalizeOpts(options: string[] | Opt[]): Opt[] {
  if (options.length === 0) return []
  if (typeof options[0] === "string") {
    return (options as string[]).map(o => ({ value: o, label: o }))
  }
  return options as Opt[]
}

function labelFor(value: string, opts: Opt[]): string {
  return opts.find(o => o.value === value)?.label ?? value
}

export function SaveIndicator({ saving, saved, error }: { saving: boolean; saved: boolean; error: boolean }) {
  if (saving) return <span className="text-zinc-500 text-[10px] animate-pulse whitespace-nowrap">Saving…</span>
  if (saved) return <span className="text-emerald-500 font-bold text-xs whitespace-nowrap">✓</span>
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
    <div className="flex flex-col sm:flex-row gap-1.5 py-3 border-b border-zinc-100 last:border-0 relative group">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:w-40 shrink-0 pt-0.5 mt-[2px]">{label}</dt>
      <dd className="flex-1 min-w-0 pr-6">
        {inputType === "checkbox" ? (
          <input type="checkbox" className="accent-emerald-500 w-4 h-4 mt-1 cursor-pointer"
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
            {local && <div className="w-5 h-5 rounded-full border border-zinc-200 shrink-0" style={{ backgroundColor: local }} />}
            <div onClick={() => setIsEditing(true)} className="text-sm text-zinc-900 cursor-text hover:bg-zinc-100 rounded px-2 py-1 transition-colors">{local || <span className="text-zinc-400 italic text-xs">Click to edit</span>}</div>
          </div>
        ) : isEditing ? (
          <input ref={inputRef} type={inputType} value={local}
            onChange={e => setLocal(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown}
            className="w-full bg-white text-zinc-900 text-sm outline-none border border-emerald-200 focus:border-emerald-500 rounded-lg px-2 py-1 shadow-sm transition-all" />
        ) : (
          <div onClick={() => setIsEditing(true)} className="w-full text-sm text-zinc-800 cursor-text hover:bg-zinc-50 rounded-lg border border-transparent px-2 py-1 -ml-2 transition-colors min-h-[30px] flex items-center">
            {local || <span className="text-zinc-400 italic text-xs">Click to edit</span>}
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
  clientId: string; label: string; value: string; field: string; section?: string;
  options: string[] | Opt[];
  onCustomSave?: (v: string, u: any) => void;
}) {
  const opts = normalizeOpts(options)
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
    <div className="flex flex-col sm:flex-row gap-1.5 py-3 border-b border-zinc-100 last:border-0 relative">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:w-40 shrink-0 pt-0.5 mt-[2px]">{label}</dt>
      <dd className="flex-1 min-w-0 pr-6">
        {isEditing ? (
          <select autoFocus value={local} onChange={e => handleSave(e.target.value)} onBlur={() => setIsEditing(false)}
            className="w-full bg-white text-zinc-900 text-sm outline-none border border-emerald-200 focus:border-emerald-500 rounded-lg px-2 py-1 shadow-sm">
            <option value="">Select…</option>
            {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <div onClick={() => setIsEditing(true)} className="w-full text-sm text-zinc-800 cursor-pointer hover:bg-zinc-50 rounded-lg px-2 py-1 -ml-2 transition-colors min-h-[30px] flex items-center">
            {local ? labelFor(local, opts) : <span className="text-zinc-400 italic text-xs">Click to select</span>}
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
    <div className="space-y-1.5 py-2 border-b border-zinc-100 last:border-0">
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</label>
        <SaveIndicator saving={saving} saved={saved} error={error} />
      </div>
      {isEditing ? (
        <textarea autoFocus value={local} rows={4} onChange={e => setLocal(e.target.value)} onBlur={handleSave}
          className="w-full bg-white border border-emerald-200 focus:border-emerald-500 text-zinc-900 text-sm rounded-xl px-4 py-3 outline-none resize-none placeholder-zinc-400 shadow-sm transition-all"
          placeholder={placeholder || "Type here…"} />
      ) : (
        <div onClick={() => setIsEditing(true)}
          className="w-full bg-transparent border border-transparent hover:border-zinc-200 hover:bg-zinc-50 text-zinc-800 text-sm rounded-xl px-4 py-3 cursor-text min-h-[80px] whitespace-pre-wrap transition-colors">
          {local || <span className="text-zinc-400 italic">Click to edit…</span>}
        </div>
      )}
    </div>
  )
}

export function ETagList({ label, value }: { label: string; value: string[] | string }) {
  const tags = Array.isArray(value) ? value : (typeof value === "string" && value ? value.split(",").map(t => t.trim()) : [])
  return (
    <div className="flex flex-col sm:flex-row gap-1.5 py-3 border-b border-zinc-100 last:border-0">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:w-40 shrink-0 pt-0.5">{label}</dt>
      <dd className="flex-1 min-w-0 flex flex-wrap gap-1.5">
        {tags.length > 0
          ? tags.map((t, i) => <span key={i} className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-600 border-emerald-100">{t}</span>)
          : <span className="text-zinc-400 text-xs italic">—</span>}
      </dd>
    </div>
  )
}

export function EMultiSelect({
  clientId, label, value, field, section, options,
}: {
  clientId: string; label: string; value: string[] | string; field: string; section?: string;
  options: string[] | Opt[];
}) {
  const opts = normalizeOpts(options)
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
    <div className="flex flex-col sm:flex-row gap-1.5 py-3 border-b border-zinc-100 last:border-0 relative">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:w-40 shrink-0 pt-0.5 mt-[2px]">{label}</dt>
      <dd className="flex-1 min-w-0 pr-6">
        <div className="flex flex-wrap gap-1.5 min-h-[30px] items-center">
          {currentTags.map((t, i) => (
            <span key={i} className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-600 border-emerald-100">
              {labelFor(t, opts)}
            </span>
          ))}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors px-2 py-0.5 rounded border border-dashed border-zinc-200 hover:border-zinc-300"
          >
            {isEditing ? "Close" : "+ Edit Tags"}
          </button>
        </div>

        {isEditing && (
          <div className="mt-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {opts.map(o => {
              const active = currentTags.includes(o.value)
              return (
                <button
                  key={o.value}
                  onClick={() => toggleTag(o.value)}
                  className={`px-3 py-1 rounded-lg text-xs transition-all ${
                    active
                      ? "bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/20"
                      : "bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  {o.label}
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

export function ESlider({
  clientId, label, value, field, section, min = 1, max = 10, leftLabel, rightLabel,
}: {
  clientId: string; label: string; value: number | string; field: string; section?: string;
  min?: number; max?: number; leftLabel?: string; rightLabel?: string;
}) {
  const initial = typeof value === "number" ? value : (parseInt(String(value)) || 5)
  const [local, setLocal] = useState<number>(initial)
  const { update, saving, saved, error } = useClientUpdate(clientId)

  useEffect(() => setLocal(initial), [initial])

  function commit(v: number) {
    if (v === initial) return
    if (section) update(section, { [field]: v })
    else update(field, v)
  }

  return (
    <div className="flex flex-col gap-1.5 py-3 border-b border-zinc-100 last:border-0 relative">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</dt>
      <dd className="flex-1 min-w-0 pr-6">
        <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
          <span>{leftLabel ?? `${min}`}</span>
          <span className="text-emerald-600 font-semibold tabular-nums">{local}/{max}</span>
          <span>{rightLabel ?? `${max}`}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={local}
          onChange={e => setLocal(Number(e.target.value))}
          onMouseUp={() => commit(local)}
          onTouchEnd={() => commit(local)}
          onKeyUp={() => commit(local)}
          className="w-full accent-emerald-500"
        />
      </dd>
      <div className="absolute right-0 top-3"><SaveIndicator saving={saving} saved={saved} error={error} /></div>
    </div>
  )
}

export function EUrlPreview({
  clientId, label, value, field, section,
}: {
  clientId: string; label: string; value: string; field: string; section?: string;
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
      if (section) update(section, { [field]: local })
      else update(field, local)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-1.5 py-3 border-b border-zinc-100 last:border-0 relative">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:w-40 shrink-0 pt-0.5 mt-[2px]">{label}</dt>
      <dd className="flex-1 min-w-0 pr-6">
        {isEditing ? (
          <input
            ref={inputRef}
            type="url"
            value={local}
            onChange={e => setLocal(e.target.value)}
            onBlur={handleSave}
            onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setLocal(value); setIsEditing(false) } }}
            className="w-full bg-white text-zinc-900 text-sm outline-none border border-emerald-200 focus:border-emerald-500 rounded-lg px-2 py-1 shadow-sm transition-all"
            placeholder="https://…"
          />
        ) : (
          <div className="flex items-center gap-2 min-h-[30px]">
            {local ? (
              <>
                <a href={local} target="_blank" rel="noopener noreferrer"
                   className="text-sm text-emerald-600 hover:underline truncate max-w-[260px]">
                  {local}
                </a>
                <button onClick={() => setIsEditing(true)}
                        className="text-[10px] uppercase tracking-wider text-zinc-500 hover:text-zinc-900 border border-dashed border-zinc-200 rounded px-1.5 py-0.5 transition-colors">
                  Edit
                </button>
              </>
            ) : (
              <div onClick={() => setIsEditing(true)}
                   className="text-sm text-zinc-400 italic cursor-text hover:text-zinc-600 transition-colors">
                Click to add URL
              </div>
            )}
          </div>
        )}
      </dd>
      <div className="absolute right-0 top-3"><SaveIndicator saving={saving} saved={saved} error={error} /></div>
    </div>
  )
}

export function SectionCard({ title, accent = "#70BF4B", isDone, children }: { title: string; accent?: string; isDone?: boolean; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm h-fit">
      <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
          <h3 className="text-zinc-900 text-sm font-semibold">{title}</h3>
        </div>
        {isDone !== undefined && (
          isDone ? (
            <span className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">Done</span>
          ) : (
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider border border-zinc-200 px-2.5 py-0.5 rounded-full bg-white">Pending</span>
          )
        )}
      </div>
      <dl className="px-5 py-1">{children}</dl>
    </div>
  )
}
