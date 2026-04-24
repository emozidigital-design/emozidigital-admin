/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import useSWR from "swr"
import Link from "next/link"
import { exportToCSV } from "@/lib/exportCSV"
import { useClientUpdate } from "@/lib/useClientUpdate"
import OnboardingViewer from "./_components/OnboardingViewer"

const fetcher = (url: string) => fetch(url).then(r => r.json())

function todayStr() {
  return new Date().toISOString().split("T")[0].replace(/-/g, "")
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SupabaseClient = {
  id: string
  email: string
  legal_name: string
  status: string
  current_step: string
  created_at: string
  section_a: Record<string, unknown> | null
  section_b: Record<string, unknown> | null
  section_c: Record<string, unknown> | null
  section_d: Record<string, unknown> | null
  section_e: Record<string, unknown> | null
  section_f: Record<string, unknown> | null
  section_g: Record<string, unknown> | null
  section_h: Record<string, unknown> | null
  section_i: Record<string, unknown> | null
  section_j: Record<string, unknown> | null
  section_k: Record<string, unknown> | null
  section_l: Record<string, unknown> | null
  section_m: Record<string, unknown> | null
  section_notes: string | null
}

type SocialAccount = {
  platform?: string
  handle?: string
  url?: string
  status?: string
  adAccountId?: string
}

type CalendarEntry = {
  id: string
  title: string
  type: string
  platform: string
  status: string
  scheduled_date: string | null
}

type ApiResponse = {
  client: SupabaseClient
  contentCalendar: CalendarEntry[]
  error?: string
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/5 ${className}`} />
}

const STATUS_COLOR: Record<string, string> = {
  active:   "bg-[#70BF4B]/15 text-[#70BF4B] border-[#70BF4B]/30",
  inactive: "bg-zinc-700/30 text-zinc-400 border-zinc-600/30",
  pending:  "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  completed:"bg-sky-500/15 text-sky-400 border-sky-500/30",
}
const RISK_COLOR: Record<string, string> = {
  Green: "bg-[#70BF4B]/15 text-[#70BF4B] border-[#70BF4B]/30",
  Amber: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Red:   "bg-red-500/15 text-red-400 border-red-500/30",
}

function Badge({ label, colorMap }: { label: string; colorMap: Record<string, string> }) {
  if (!label) return <span className="text-zinc-600">—</span>
  const cls = colorMap[label] ?? colorMap[label.toLowerCase()] ?? "bg-zinc-700/30 text-zinc-400 border-zinc-600/30"
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{label}</span>
}

function SaveIndicator({ saving, saved, error }: { saving: boolean, saved: boolean, error: boolean }) {
  if (saving) return <span className="text-zinc-500 text-[10px] animate-pulse whitespace-nowrap">Saving…</span>
  if (saved) return <span className="text-[#70BF4B] font-bold text-xs whitespace-nowrap">✓</span>
  if (error) return <span className="text-red-500 text-[10px] whitespace-nowrap">Error</span>
  return null
}

// ─── Inline editing ───────────────────────────────────────────────────────────

function EditableField({
  clientId, label, value, field, section, inputType = "text", onCustomSave
}: {
  clientId: string; label: string; value: string; field: string; section?: string; inputType?: string; onCustomSave?: (v: string, updateFn: (s: string, v: unknown) => void) => void
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
    if (e.key === "Escape") {
      setLocal(value)
      setIsEditing(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-1.5 py-3 border-b border-[#003434] last:border-0 relative">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:w-36 shrink-0 pt-0.5 mt-[2px]">
        {label}
      </dt>
      <dd className="flex-1 min-w-0 pr-6">
        {inputType === "checkbox" ? (
          <div className="flex items-center h-full pt-1">
            <input 
              type="checkbox" 
              className="accent-[#70BF4B] w-4 h-4"
              checked={local === "true" || local === true as unknown}
              onChange={e => {
                const val = e.target.checked
                setLocal(val as unknown as string)
                if (onCustomSave) onCustomSave(String(val), update)
                else if (section) update(section, { [field]: val })
                else update(field, val)
              }}
            />
          </div>
        ) : isEditing ? (
          <input
            ref={inputRef}
            type={inputType}
            value={local}
            onChange={e => setLocal(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={`w-full bg-[#001f1f] text-white text-sm outline-none border border-[#70BF4B]/50 rounded-lg px-2 py-1 ${inputType === 'color' ? 'h-8 cursor-pointer' : ''}`}
          />
        ) : (
          <div 
             onClick={() => setIsEditing(true)}
             className="w-full text-sm text-zinc-200 cursor-text hover:bg-white/5 rounded-lg border border-transparent px-2 py-1 -ml-2 transition-colors min-h-[30px] flex items-center"
          >
             {inputType === "color" && local ? (
                <div className="w-4 h-4 rounded-full border border-white/20 mr-2 shrink-0" style={{ backgroundColor: local }} />
             ) : null}
             {local || <span className="text-zinc-600 italic text-xs">Click to edit</span>}
          </div>
        )}
      </dd>
      <div className="absolute right-0 top-3">
        <SaveIndicator saving={saving} saved={saved} error={error} />
      </div>
    </div>
  )
}

function EditableSelect({
  clientId, label, value, field, section, options, onCustomSave
}: {
  clientId: string; label: string; value: string; field: string; section?: string; options: string[]; onCustomSave?: (v: string, u: any) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [local, setLocal] = useState(value)
  const { update, saving, saved, error } = useClientUpdate(clientId)

  useEffect(() => setLocal(value), [value])

  function handleSave(newVal: string) {
    setLocal(newVal)
    setIsEditing(false)
    if (String(newVal) !== String(value)) {
      if (onCustomSave) onCustomSave(newVal, update)
      else if (section) update(section, { [field]: newVal })
      else update(field, newVal)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-1.5 py-3 border-b border-[#003434] last:border-0 relative">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:w-36 shrink-0 pt-0.5 mt-[2px]">
        {label}
      </dt>
      <dd className="flex-1 min-w-0 pr-6">
        {isEditing ? (
          <select
            autoFocus
            value={local}
            onChange={e => handleSave(e.target.value)}
            onBlur={() => setIsEditing(false)}
            className="w-full bg-[#001f1f] text-white text-sm outline-none border border-[#70BF4B]/50 rounded-lg px-2 py-1"
          >
            <option value="" disabled>Select...</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <div onClick={() => setIsEditing(true)} className="w-full text-sm text-zinc-200 cursor-pointer hover:bg-white/5 rounded-lg px-2 py-1 -ml-2 transition-colors min-h-[30px] flex items-center">
            {local || <span className="text-zinc-600 italic text-xs">Click to select</span>}
          </div>
        )}
      </dd>
      <div className="absolute right-0 top-3">
        <SaveIndicator saving={saving} saved={saved} error={error} />
      </div>
    </div>
  )
}

function EditableTextarea({
  clientId, label, value, field, section, onCustomSave, placeholder
}: {
  clientId: string; label: string; value: string; field: string; section?: string; onCustomSave?: (v: string, u: any) => void; placeholder?: string
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
    <div className="space-y-1.5 py-2">
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</label>
        <SaveIndicator saving={saving} saved={saved} error={error} />
      </div>
      {isEditing ? (
        <textarea
          autoFocus
          value={local}
          rows={5}
          onChange={e => setLocal(e.target.value)}
          onBlur={handleSave}
          className="w-full bg-[#001f1f] border border-[#70BF4B]/50 text-zinc-200 text-sm rounded-xl px-4 py-3 outline-none transition-colors resize-none placeholder-zinc-700 shadow-inner"
          placeholder={placeholder || "Type here…"}
        />
      ) : (
        <div 
          onClick={() => setIsEditing(true)}
          className="w-full bg-transparent border border-transparent hover:border-[#003434] hover:bg-white/5 text-zinc-200 text-sm rounded-xl px-4 py-3 outline-none transition-colors cursor-text min-h-[100px] whitespace-pre-wrap"
        >
          {local || <span className="text-zinc-600 italic">Click to add notes…</span>}
        </div>
      )}
    </div>
  )
}

// ─── Tab 1: Overview ──────────────────────────────────────────────────────────

function OverviewTab({ client }: { client: SupabaseClient }) {
  const sA = client.section_a ?? {}
  const sB = client.section_b ?? {}

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-[#003434] flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-[#70BF4B]" />
          <h3 className="text-white text-sm font-semibold">Business Info</h3>
        </div>
        <dl className="px-5 py-1">
          <EditableField clientId={client.id} label="Legal Name" field="legal_name" value={client.legal_name || ''} />
          <EditableField clientId={client.id} label="Email" field="email" value={client.email || ''} inputType="email" />
          <EditableField clientId={client.id} label="WhatsApp" field="phone" section="section_a" value={String(sA.phone || sB.phone || '')} />
          <EditableField clientId={client.id} label="Website" field="website" section="section_a" value={String(sA.website || '')} />
        </dl>
      </div>

      <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-[#003434] flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-[#70BF4B]" />
          <h3 className="text-white text-sm font-semibold">Status</h3>
        </div>
        <dl className="px-5 py-1">
          <EditableSelect clientId={client.id} label="Status" field="status" value={client.status || ''} options={['active', 'inactive', 'pending', 'completed']} />
          <EditableSelect clientId={client.id} label="Current Step" field="current_step" value={client.current_step || ''} options={['onboarding', 'active', 'churned']} />
        </dl>
      </div>
    </div>
  )
}

// ─── Phase 5.4+ Custom Tools for Brand Kit ──────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

function LogoUploadBlock({
  clientId, section, dataObj, logoKey, label
}: {
  clientId: string; section: string; /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ dataObj: any; logoKey: string; label: string;
}) {
  const { update, saving, saved, error } = useClientUpdate(clientId)
  const currentUrl = dataObj.logos?.[logoKey] || ""
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await fileToBase64(file)
      const newLogos = { ...(dataObj.logos || {}), [logoKey]: base64 }
      update(section, { ...dataObj, logos: newLogos })
    } catch (err) {
      console.error(err)
    }
  }

  function handleRemove() {
    const newLogos = { ...(dataObj.logos || {}) }
    delete newLogos[logoKey]
    update(section, { ...dataObj, logos: newLogos })
  }

  return (
    <div className="bg-[#001f1f] border border-[#003434] rounded-xl p-4 flex flex-col items-center gap-3 relative overflow-hidden group">
      <div className="absolute top-2 right-2 flex items-center gap-2">
         <SaveIndicator saving={saving} saved={saved} error={error} />
      </div>
      <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{label}</h4>
      <div className="w-full aspect-video bg-[#001a1a] border border-dashed border-[#003434] rounded-lg flex items-center justify-center overflow-hidden relative">
        {currentUrl ? (
          <>
            <img src={currentUrl} alt={label} className="object-contain w-full h-full p-2" />
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="bg-[#70BF4B] text-[#001a1a] text-[10px] font-bold px-4 py-1.5 rounded-lg w-28 hover:bg-[#D0F255] transition-colors">REPLACE</button>
              <button onClick={handleRemove} className="bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] font-bold px-4 py-1.5 rounded-lg w-28 hover:bg-red-500/20 transition-colors">REMOVE</button>
            </div>
          </>
        ) : (
          <button onClick={() => fileInputRef.current?.click()} className="text-zinc-500 hover:text-[#70BF4B] flex flex-col items-center gap-2 transition-colors w-full h-full justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            <span className="text-[10px] uppercase font-semibold">Upload Image</span>
          </button>
        )}
        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
      </div>
    </div>
  )
}

function BrandColorPicker({
  clientId, label, value, topKey, valKey, dataObj
}: {
  clientId: string; label: string; value: string; topKey: string; valKey: string; /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ dataObj: any;
}) {
  const [local, setLocal] = useState(value)
  const { update, saving, saved, error } = useClientUpdate(clientId)

  useEffect(() => setLocal(value), [value])

  function handleSave(newVal: string) {
    setLocal(newVal)
    if (newVal !== value) {
      const existingTop = (dataObj[topKey] as object) || {}
      update('section_c', { ...dataObj, [topKey]: { ...existingTop, [valKey]: newVal } })
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-1.5 py-3 border-b border-[#003434] last:border-0 relative">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:w-36 shrink-0 pt-1.5">
        {label}
      </dt>
      <dd className="flex-1 min-w-0 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-[#001f1f] rounded-lg p-1.5 border border-[#003434] focus-within:border-[#70BF4B]/50 transition-colors">
          <input 
            type="color" 
            value={local || '#000000'} 
            onChange={e => setLocal(e.target.value)} 
            onBlur={() => handleSave(local)}
            className="w-6 h-6 rounded cursor-pointer shrink-0 border-0 p-0 shadow-sm" 
          />
          <input 
            type="text" 
            value={local} 
            onChange={e => setLocal(e.target.value)} 
            onBlur={() => handleSave(local)} 
            onKeyDown={e => e.key === 'Enter' && handleSave(local)} 
            className="w-24 bg-transparent text-white text-sm outline-none uppercase tracking-wider" 
            placeholder="#HEX" 
          />
        </div>
        <div className="shrink-0 w-12 text-right">
          <SaveIndicator saving={saving} saved={saved} error={error} />
        </div>
      </dd>
    </div>
  )
}

function AdditionalColorPicker({
  index, clientId, colorsObj, dataObj
}: { index: number; clientId: string; /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ colorsObj: any; /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ dataObj: any }) {
  const additional = Array.isArray(colorsObj.additional) ? colorsObj.additional : []
  const val = additional[index] || ''
  const [local, setLocal] = useState(val)
  const { update, saving, saved, error } = useClientUpdate(clientId)

  useEffect(() => setLocal(val), [val])

  function handleSave(newVal: string) {
    setLocal(newVal)
    if (newVal !== val) {
      const newAdd = [...additional]
      newAdd[index] = newVal
      update('section_c', { ...dataObj, colors: { ...colorsObj, additional: newAdd } })
    }
  }

  return (
    <div className="flex items-center gap-2 bg-[#001f1f] rounded-lg p-1.5 border border-[#003434] focus-within:border-[#70BF4B]/50 transition-colors w-fit">
      <input type="color" value={local || '#000000'} onChange={e => setLocal(e.target.value)} onBlur={() => handleSave(local)} className="w-5 h-5 rounded cursor-pointer border-0 p-0" />
      <input type="text" value={local} onChange={e => setLocal(e.target.value)} onBlur={() => handleSave(local)} onKeyDown={e => e.key === 'Enter' && handleSave(local)} className="w-20 bg-transparent text-zinc-300 text-xs outline-none uppercase" placeholder="#HEX" />
      <div className="w-8 flex justify-center"><SaveIndicator saving={saving} saved={saved} error={error} /></div>
    </div>
  )
}

// ─── Tab 2: Brand Kit ─────────────────────────────────────────────────────

function BrandKitTab({ client }: { client: SupabaseClient }) {
  const sC = client.section_c ?? {}
  const colors = (sC.colors || {}) as /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ Record<string, any>
  const typo = (sC.typography || {}) as Record<string, string>
  const voice = (sC.voice || {}) as Record<string, string>

  const saveNested = (updateFn: (s: string, v: unknown) => void, topKey: string, valKey: string, val: string) => {
    const existingTop = (sC[topKey as keyof typeof sC] as object) || {}
    updateFn("section_c", { ...sC, [topKey]: { ...existingTop, [valKey]: val } })
  }

  return (
    <div className="space-y-4">
      {/* Logos Section */}
      <div className="bg-[#001a1a]/80 border border-[#003434] rounded-xl p-5 shadow-sm">
        <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-[#D0F255]" /> Logos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LogoUploadBlock clientId={client.id} dataObj={sC} section="section_c" logoKey="primary_light" label="Primary Light" />
          <LogoUploadBlock clientId={client.id} dataObj={sC} section="section_c" logoKey="primary_dark" label="Primary Dark" />
          <LogoUploadBlock clientId={client.id} dataObj={sC} section="section_c" logoKey="horizontal" label="Horizontal" />
          <LogoUploadBlock clientId={client.id} dataObj={sC} section="section_c" logoKey="alternate" label="Alternate" />
          <LogoUploadBlock clientId={client.id} dataObj={sC} section="section_c" logoKey="icon" label="Icon mark" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Colors Section */}
        <div className="bg-[#001a1a]/80 border border-[#003434] rounded-xl overflow-hidden shadow-sm h-fit">
          <div className="px-5 py-3 border-b border-[#003434] flex items-center gap-2 bg-[#001f1f]">
            <div className="w-1 h-4 rounded-full bg-[#70BF4B]" /> 
            <h3 className="text-white text-sm font-semibold">Color System</h3>
          </div>
          <dl className="px-5 py-2">
            <BrandColorPicker clientId={client.id} label="Primary Color" value={colors.primary || ''} topKey="colors" valKey="primary" dataObj={sC} />
            <BrandColorPicker clientId={client.id} label="Secondary Color" value={colors.secondary || ''} topKey="colors" valKey="secondary" dataObj={sC} />
            <BrandColorPicker clientId={client.id} label="Accent Color" value={colors.accent || ''} topKey="colors" valKey="accent" dataObj={sC} />
            
            <div className="flex flex-col sm:flex-row gap-1.5 py-4 relative">
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:w-36 shrink-0 pt-2">
                Additional Colors
              </dt>
              <dd className="flex-1 min-w-0 flex flex-wrap gap-2">
                {[0, 1, 2].map(i => (
                   <AdditionalColorPicker key={i} index={i} clientId={client.id} colorsObj={colors} dataObj={sC} />
                ))}
              </dd>
            </div>
          </dl>
        </div>

        {/* Typography & Tone */}
        <div className="bg-[#001a1a]/80 border border-[#003434] rounded-xl overflow-hidden shadow-sm h-fit">
          <div className="px-5 py-3 border-b border-[#003434] flex items-center gap-2 bg-[#001f1f]">
            <div className="w-1 h-4 rounded-full bg-[#70BF4B]" /> 
            <h3 className="text-white text-sm font-semibold">Typography & Tone</h3>
          </div>
          <dl className="px-5 py-2">
            <EditableField clientId={client.id} label="Primary Font" field="primary_font" value={typo.primary_font || ''} onCustomSave={(v, u) => saveNested(u, 'typography', 'primary_font', v)} />
            <EditableField clientId={client.id} label="Secondary Font" field="secondary_font" value={typo.secondary_font || ''} onCustomSave={(v, u) => saveNested(u, 'typography', 'secondary_font', v)} />
            <EditableSelect clientId={client.id} label="Brand Tone" field="tone" value={String(sC.tone || '')} options={['Professional', 'Friendly', 'Bold', 'Minimal', 'Premium']} onCustomSave={(v, u) => u("section_c", { ...sC, tone: v })} />
          </dl>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Brand Voice */}
        <div className="bg-[#001a1a]/80 border border-[#003434] rounded-xl overflow-hidden shadow-sm h-fit">
          <div className="px-5 py-3 border-b border-[#003434] flex items-center gap-2 bg-[#001f1f]">
            <div className="w-1 h-4 rounded-full bg-[#D0F255]" /> 
            <h3 className="text-white text-sm font-semibold">Brand Voice</h3>
          </div>
          <dl className="px-5 py-2 space-y-2">
             <EditableTextarea clientId={client.id} label="Words to Use" field="words_to_use" value={voice.words_to_use || ''} onCustomSave={(v, u) => saveNested(u, 'voice', 'words_to_use', v)} />
             <EditableTextarea clientId={client.id} label="Words to Avoid" field="words_to_avoid" value={voice.words_to_avoid || ''} onCustomSave={(v, u) => saveNested(u, 'voice', 'words_to_avoid', v)} />
          </dl>
        </div>

        {/* Brand Story */}
        <div className="bg-[#001a1a]/80 border border-[#003434] rounded-xl overflow-hidden shadow-sm h-fit">
          <div className="px-5 py-3 border-b border-[#003434] flex items-center gap-2 bg-[#001f1f]">
            <div className="w-1 h-4 rounded-full bg-[#D0F255]" /> 
            <h3 className="text-white text-sm font-semibold">Brand Story</h3>
          </div>
          <dl className="px-5 py-2">
            <EditableTextarea clientId={client.id} label="Story & Positioning" field="brand_story" value={String(sC.brand_story || '')} placeholder="Describe brand story, positioning, mission…" onCustomSave={(v, u) => u("section_c", { ...sC, brand_story: v })} />
          </dl>
        </div>
      </div>
    </div>
  )
}

// ─── Tab 3: Social Accounts ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InlineTableCell({
  clientId, section, currentArray, index, field, value, placeholder = "—", inputType = "text"
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clientId: string; section: string; currentArray: any[]; index: number; field: string; value: string; placeholder?: string; inputType?: string;
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [local, setLocal] = useState(value)
  const { update } = useClientUpdate(clientId)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setLocal(value), [value])

  useEffect(() => {
    if (isEditing && inputRef.current) inputRef.current.focus()
  }, [isEditing])

  function handleSave() {
    setIsEditing(false)
    if (String(local) !== String(value)) {
      const newArr = [...currentArray]
      newArr[index] = { ...newArr[index], [field]: local }
      update(section, { accounts: newArr })
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave()
    if (e.key === "Escape") {
      setLocal(value)
      setIsEditing(false)
    }
  }

  return isEditing ? (
    <input
      ref={inputRef}
      type={inputType}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      className="w-full bg-[#001a1a] text-white text-sm outline-none border border-[#70BF4B]/50 rounded px-2 py-1"
      placeholder={placeholder}
    />
  ) : (
    <div onClick={() => setIsEditing(true)} className="cursor-text hover:bg-white/5 px-2 py-1 -ml-2 rounded transition-colors text-sm min-h-[28px] flex items-center">
      {local || <span className="text-zinc-600 italic text-xs">edit</span>}
    </div>
  )
}

function SocialTab({ client }: { client: SupabaseClient }) {
  const sD = client.section_d ?? {}
  const accounts: SocialAccount[] = Array.isArray(sD.accounts) ? sD.accounts : []

  if (accounts.length === 0) {
    return <EmptyState icon="📱" message="No social accounts linked yet." />
  }

  return (
    <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#003434]">
              {["Platform", "Handle", "URL", "Status", "Ad Account ID"].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-4 py-3.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#003434]/50">
            {accounts.map((a, i) => (
              <tr key={i} className="hover:bg-[#003434]/30 transition-colors">
                <td className="px-4 py-2 text-white font-medium">
                  <InlineTableCell clientId={client.id} section="section_d" currentArray={accounts} index={i} field="platform" value={a.platform || ''} />
                </td>
                <td className="px-4 py-2 text-zinc-300 font-mono">
                  <InlineTableCell clientId={client.id} section="section_d" currentArray={accounts} index={i} field="handle" value={a.handle || ''} placeholder="@handle" />
                </td>
                <td className="px-4 py-2 text-zinc-300">
                  <InlineTableCell clientId={client.id} section="section_d" currentArray={accounts} index={i} field="url" value={a.url || ''} placeholder="https://" />
                </td>
                <td className="px-4 py-2">
                  <InlineTableCell clientId={client.id} section="section_d" currentArray={accounts} index={i} field="status" value={a.status || ''} placeholder="connected" />
                </td>
                <td className="px-4 py-2 text-zinc-400 font-mono">
                  <InlineTableCell clientId={client.id} section="section_d" currentArray={accounts} index={i} field="adAccountId" value={a.adAccountId || ''} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab 4: Onboarding Progress ───────────────────────────────────────────────

function OnboardingTab({ client }: { client: SupabaseClient }) {
  return <OnboardingViewer client={client as any} />
}

// ─── Tab 5: Content Calendar ──────────────────────────────────────────────────

function CalendarStatusCell({ entry, onUpdate }: { entry: CalendarEntry; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false)
  const OPTIONS = ["draft", "review", "scheduled", "published"]
  
  async function handleChange(newStatus: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/content-calendar/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) onUpdate()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const status = entry.status?.toLowerCase() || "draft"
  const colorCls = 
    status === "published" ? "bg-[#70BF4B]/15 text-[#70BF4B] border-[#70BF4B]/30" :
    status === "scheduled" ? "bg-sky-500/15 text-sky-400 border-sky-500/30" :
    status === "review"    ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" :
                             "bg-zinc-700/30 text-zinc-400 border-zinc-600/30"

  return (
    <div className="relative">
      <select
        value={status}
        disabled={loading}
        onChange={(e) => handleChange(e.target.value)}
        className={`appearance-none px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer outline-none transition-colors ${colorCls} pr-6`}
      >
        {OPTIONS.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        {loading ? (
          <div className="w-2 h-2 rounded-full bg-[#70BF4B] animate-ping" />
        ) : (
          <svg className="w-3 h-3 text-current opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
    </div>
  )
}

function CalendarTab({ entries, onUpdate }: { entries: CalendarEntry[]; onUpdate: () => void }) {
  if (entries.length === 0) {
    return <EmptyState icon="📅" message="No content calendar entries for this client." />
  }
  return (
    <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#003434]">
              {["Title", "Type", "Platform", "Status", "Scheduled Date"].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-4 py-3.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#003434]/50">
            {entries.map(e => (
              <tr key={e.id} className="hover:bg-[#003434]/30 transition-colors">
                <td className="px-4 py-3.5 text-white text-sm font-medium max-w-[200px] truncate">{e.title || "—"}</td>
                <td className="px-4 py-3.5 text-zinc-300 text-sm">{e.type || "—"}</td>
                <td className="px-4 py-3.5 text-zinc-400 text-sm">{e.platform || "—"}</td>
                <td className="px-4 py-3.5"><CalendarStatusCell entry={e} onUpdate={onUpdate} /></td>
                <td className="px-4 py-3.5 text-zinc-500 text-sm font-mono">{e.scheduled_date ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab 6: Legal & Compliance ────────────────────────────────────────────────

function LegalTab({ client }: { client: SupabaseClient }) {
  const sI = client.section_i ?? {}
  return (
    <div className="space-y-4">
      <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-[#003434] flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-red-400" />
          <h3 className="text-white text-sm font-semibold">Regulatory Flags</h3>
        </div>
        <dl className="px-5 py-1">
          <EditableField clientId={client.id} label="Regulated Industry" field="regulated_industry" section="section_i" value={String(sI.regulated_industry || '')} inputType="checkbox" />
          <EditableField clientId={client.id} label="Disallowed Topics" field="disallowed_topics" section="section_i" value={String(sI.disallowed_topics || '')} />
          <EditableSelect clientId={client.id} label="NDA Status" field="nda_status" section="section_i" value={String(sI.nda_status || '')} options={['Pending', 'Signed', 'Not Required']} />
        </dl>
      </div>
    </div>
  )
}

// ─── Tab 7: Internal Notes ────────────────────────────────────────────────────

function NotesTab({ client }: { client: SupabaseClient }) {
  return (
    <div className="space-y-4">
      <div className="bg-[#001f1f] border border-[#003434] rounded-xl p-5 shadow-sm">
        <EditableTextarea clientId={client.id} label="Internal Notes" field="section_notes" value={client.section_notes || ''} />
      </div>
      <p className="text-zinc-700 text-xs text-center">Data autosaves after 500ms on blur or enter.</p>
    </div>
  )
}

// ─── Tab 8: Access & Credentials (section_l) ──────────────────────────────────

const PLATFORMS = ["Instagram", "Facebook", "LinkedIn", "Twitter/X", "YouTube", "GBP", "WhatsApp", "Pinterest"]

function AccessCredentialsTab({ client }: { client: SupabaseClient }) {
  const sL = client.section_l ?? {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const credentials = (Array.isArray(sL.platform_credentials) ? sL.platform_credentials : []) as any[]
  const { update } = useClientUpdate(client.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function updateCredential(platform: string, field: string, value: any) {
    const newCreds = [...credentials]
    const idx = newCreds.findIndex(c => c.platform === platform)
    if (idx >= 0) {
      newCreds[idx] = { ...newCreds[idx], [field]: value }
    } else {
      newCreds.push({ platform, [field]: value })
    }
    update('section_l', { platform_credentials: newCreds })
  }

  function getCred(platform: string, field: string) {
    const c = credentials.find(x => x.platform === platform)
    return c ? c[field] : ""
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function InlineCredInput({ platform, field, val, type = "text" }: { platform: string, field: string, val: any, type?: string }) {
    const [isEditing, setIsEditing] = useState(false)
    const [local, setLocal] = useState(val)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => setLocal(val), [val])
    useEffect(() => { if (isEditing && inputRef.current) inputRef.current.focus() }, [isEditing])

    const handleSave = () => {
      setIsEditing(false)
      if (String(local) !== String(val)) updateCredential(platform, field, local)
    }

    if (type === "checkbox") {
      return (
        <input 
          type="checkbox" 
          checked={!!local} 
          onChange={e => {
            setLocal(e.target.checked)
            updateCredential(platform, field, e.target.checked)
          }} 
          className="w-4 h-4"
        />
      )
    }

    return isEditing ? (
      <input
        ref={inputRef}
        type={type}
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => e.key === "Enter" && handleSave()}
        className="w-full bg-[#001a1a] text-white text-sm outline-none border border-[#70BF4B]/50 rounded px-2 py-1"
        placeholder={`${field}...`}
      />
    ) : (
      <div onClick={() => setIsEditing(true)} className="cursor-text hover:bg-white/5 px-2 py-1 -ml-2 rounded transition-colors text-sm min-h-[28px] flex items-center">
        {local || <span className="text-zinc-600 border-b border-dashed border-zinc-600/50">Add {field}</span>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 shadow-sm">
        <span className="text-red-400">⚠️</span>
        <p className="text-red-400 text-sm font-medium">Credentials visible to admin only.</p>
      </div>

      <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-[#003434] flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-[#70BF4B]" />
          <h3 className="text-white text-sm font-semibold">General Access</h3>
        </div>
        <dl className="px-5 py-1">
          <EditableField clientId={client.id} label="Vault ID" field="vault_id" section="section_l" value={String(sL.vault_id || '')} />
          <EditableField clientId={client.id} label="Registered Email" field="registered_email" section="section_l" value={String(sL.registered_email || '')} />
          <EditableField clientId={client.id} label="Registered Phone" field="registered_phone" section="section_l" value={String(sL.registered_phone || '')} />
          <EditableField clientId={client.id} label="Meta BM ID" field="meta_business_manager_id" section="section_l" value={String(sL.meta_business_manager_id || '')} />
          <EditableField clientId={client.id} label="Meta Access Status" field="meta_access_status" section="section_l" value={String(sL.meta_access_status || '')} />
          <EditableField clientId={client.id} label="CMS Login Status" field="cms_login_status" section="section_l" value={String(sL.cms_login_status || '')} />
        </dl>
      </div>

      <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-[#003434] flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-[#70BF4B]" />
          <h3 className="text-white text-sm font-semibold">Toggles</h3>
        </div>
        <dl className="px-5 py-1 grid grid-cols-1 sm:grid-cols-3">
          <EditableField clientId={client.id} label="Domain Registrar" field="domain_registrar_access" section="section_l" value={String(sL.domain_registrar_access || '')} inputType="checkbox" />
          <EditableField clientId={client.id} label="GA4 Access" field="ga4_access" section="section_l" value={String(sL.ga4_access || '')} inputType="checkbox" />
          <EditableField clientId={client.id} label="GTM Access" field="gtm_access" section="section_l" value={String(sL.gtm_access || '')} inputType="checkbox" />
        </dl>
      </div>

      <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-[#003434] flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-[#70BF4B]" />
          <h3 className="text-white text-sm font-semibold">Platform Credentials</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#003434]">
                {["Platform", "Login Email", "Password Saved", "2FA", "Notes"].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-4 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#003434]/50">
              {PLATFORMS.map(p => (
                <tr key={p}>
                  <td className="px-4 py-2 text-white text-sm font-medium">{p}</td>
                  <td className="px-4 py-2"><InlineCredInput platform={p} field="login_email" val={getCred(p, 'login_email')} /></td>
                  <td className="px-4 py-2"><InlineCredInput platform={p} field="password_saved" val={getCred(p, 'password_saved')} type="checkbox" /></td>
                  <td className="px-4 py-2"><InlineCredInput platform={p} field="two_fa" val={getCred(p, 'two_fa')} type="checkbox" /></td>
                  <td className="px-4 py-2"><InlineCredInput platform={p} field="notes" val={getCred(p, 'notes')} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#001f1f] border border-[#003434] rounded-xl p-5 shadow-sm">
        <EditableTextarea clientId={client.id} label="Internal Notes (Access)" field="internal_notes" section="section_l" value={String(sL.internal_notes || '')} />
      </div>
    </div>
  )
}

// ─── Tab 9: Package & Project (section_m) ─────────────────────────────────────

function PackageTab({ client }: { client: SupabaseClient }) {
  const sM = client.section_m ?? {}
  
  // Auto calculate renewal date based on contract start + 12 months
  const renewalDate = useMemo(() => {
    if (!sM.contract_start) return ""
    try {
      const d = new Date(sM.contract_start as string)
      d.setFullYear(d.getFullYear() + 1)
      return d.toISOString().split("T")[0]
    } catch { return "" }
  }, [sM.contract_start])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Core Package Details */}
        <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-[#003434] flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-[#70BF4B]" />
            <h3 className="text-white text-sm font-semibold">Package Details</h3>
          </div>
          <dl className="px-5 py-1">
            <EditableSelect clientId={client.id} label="Package" field="package" section="section_m" value={String(sM.package || '')} options={['AI Automation', 'Website', 'SEO', 'Social', 'Consulting', 'Bundle']} />
            <EditableSelect clientId={client.id} label="Tier" field="tier" section="section_m" value={String(sM.tier || '')} options={['Starter', 'Growth', 'Premium', 'Enterprise', 'Custom']} />
            <EditableField clientId={client.id} label="Monthly Value (₹)" field="monthly_value" section="section_m" inputType="number" value={String(sM.monthly_value || '')} />
          </dl>
        </div>

        {/* Status & Risk */}
        <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-[#003434] flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-[#70BF4B]" />
            <h3 className="text-white text-sm font-semibold">Status & Risk</h3>
          </div>
          <dl className="px-5 py-1">
            <EditableSelect clientId={client.id} label="Onboarding" field="onboarding_status" section="section_m" value={String(sM.onboarding_status || '')} options={['Not Started', 'In Progress', 'Submitted', 'Completed', 'Blocked']} />
            <EditableSelect clientId={client.id} label="Payment Status" field="payment_status" section="section_m" value={String(sM.payment_status || '')} options={['Pending', 'Received', 'Partial', 'Overdue']} />
            <div className="flex px-1 items-center mb-2 mt-2">
               <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 w-[130px] shrink-0">Current Risk:</span>
               <Badge label={String(sM.risk_profile || '') || 'None'} colorMap={RISK_COLOR} />
            </div>
            <EditableSelect clientId={client.id} label="Risk Profile" field="risk_profile" section="section_m" value={String(sM.risk_profile || '')} options={['Green', 'Amber', 'Red']} />
            <EditableField clientId={client.id} label="Handoff Complete?" field="handoff_complete" section="section_m" inputType="checkbox" value={String(sM.handoff_complete || '')} />
          </dl>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-[#003434] flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-[#70BF4B]" />
          <h3 className="text-white text-sm font-semibold">Timeline & Contracts</h3>
        </div>
        <dl className="px-5 py-1 grid grid-cols-1 sm:grid-cols-2">
          <EditableField clientId={client.id} label="Contract Start" field="contract_start" section="section_m" inputType="date" value={String(sM.contract_start || '')} />
          <EditableField clientId={client.id} label="Contract End" field="contract_end" section="section_m" inputType="date" value={String(sM.contract_end || '')} />
          
          <div className="flex flex-col sm:flex-row gap-1.5 py-3 border-b border-[#003434] last:border-0 sm:col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:w-36 shrink-0 pt-0.5 mt-[2px]">
              Renewal Date (Auto)
            </dt>
            <dd className="flex-1 min-w-0 flex items-center gap-3 text-zinc-400 text-sm px-2">
              {renewalDate || "—"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Operations & Links */}
      <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-[#003434] flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-[#70BF4B]" />
          <h3 className="text-white text-sm font-semibold">Operations</h3>
        </div>
        <dl className="px-5 py-1 grid grid-cols-1 sm:grid-cols-2">
          <EditableField clientId={client.id} label="Assigned AM" field="assigned_am" section="section_m" value={String(sM.assigned_am || '')} />
          <EditableField clientId={client.id} label="Content Executive" field="content_executive" section="section_m" value={String(sM.content_executive || '')} />
          <EditableField clientId={client.id} label="Developer" field="developer" section="section_m" value={String(sM.developer || '')} />
          <EditableField clientId={client.id} label="HubSpot Deal ID" field="hubspot_deal_id" section="section_m" value={String(sM.hubspot_deal_id || '')} />
          <EditableField clientId={client.id} label="Notion URL" field="notion_workspace_url" section="section_m" inputType="url" value={String(sM.notion_workspace_url || '')} />
          <EditableField clientId={client.id} label="Invoice Number" field="invoice_number" section="section_m" value={String(sM.invoice_number || '')} />
        </dl>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[#001f1f] border border-[#003434] rounded-xl p-5 shadow-sm">
          <EditableTextarea clientId={client.id} label="Risk Notes" field="risk_notes" section="section_m" value={String(sM.risk_notes || '')} />
        </div>
        <div className="bg-[#001f1f] border border-[#003434] rounded-xl p-5 shadow-sm">
          <EditableTextarea clientId={client.id} label="Special Instructions" field="special_instructions" section="section_m" value={String(sM.special_instructions || '')} />
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="bg-[#001f1f] border border-[#003434] rounded-xl py-16 flex flex-col items-center text-center gap-3">
      <span className="text-3xl">{icon}</span>
      <p className="text-zinc-500 text-sm">{message}</p>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

const TABS = [
  "Overview", "Brand Kit", "Social Accounts", "Onboarding", "Content Calendar", "Legal", "Internal Notes", "Access & Credentials", "Package & Project"
]

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState(0)
  const { data, isLoading, error, mutate } = useSWR<ApiResponse>(`/api/clients/${params.id}`, fetcher)

  if (isLoading) {
    return (
      <div className="space-y-6 pb-20 lg:pb-4">
        <Skeleton className="h-5 w-24" />
        <div className="bg-[#001f1f] border border-[#003434] rounded-2xl p-6">
          <div className="flex gap-4">
            <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-3 w-32" /></div>
          </div>
        </div>
        <div className="flex gap-2">{TABS.map(t => <Skeleton key={t} className="h-8 w-24 rounded-xl" />)}</div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (error || data?.error || !data?.client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
        <p className="text-white font-semibold text-lg">Client not found</p>
        <p className="text-zinc-500 text-sm">{data?.error ?? "No client matches this ID."}</p>
        <Link href="/clients" className="text-[#70BF4B] hover:text-[#D0F255] text-sm border border-[#70BF4B]/30 px-4 py-2 rounded-xl transition-colors">
          ← Back to Clients
        </Link>
      </div>
    )
  }

  const { client, contentCalendar } = data
  const mrr = client.section_m?.monthly_value

  function handleExportCsv() {
    if (!client) return
    const row: Record<string, string> = {
      id: client.id,
      email: client.email,
      legal_name: client.legal_name,
      status: client.status,
      current_step: client.current_step,
      created_at: client.created_at,
      section_notes: client.section_notes || ""
    }

    const sectionsObj = {
      a: client.section_a, b: client.section_b, c: client.section_c, 
      d: client.section_d, e: client.section_e, f: client.section_f, 
      g: client.section_g, h: client.section_h, i: client.section_i, 
      j: client.section_j, k: client.section_k, l: client.section_l, m: client.section_m
    }

    for (const [letter, obj] of Object.entries(sectionsObj)) {
      if (obj && typeof obj === 'object') {
        for (const [k, v] of Object.entries(obj)) {
          if (typeof v === 'object') row[`${letter}_${k}`] = JSON.stringify(v)
          else row[`${letter}_${k}`] = String(v ?? '')
        }
      }
    }

    const cleanName = (client.legal_name || client.email || client.id).replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const filename = `emozi_client_${cleanName}_${todayStr()}.csv`
    exportToCSV([row], filename)
  }

  return (
    <div className="space-y-5 pb-20 lg:pb-4 max-w-6xl mx-auto">
      {/* Header Utilities */}
      <div className="flex items-center justify-between">
        <Link href="/clients" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Clients
        </Link>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-[#003434] bg-[#001a1a] text-zinc-400 hover:text-white hover:border-[#70BF4B]/40 transition-all shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Details
        </button>
      </div>

      {/* Hero */}
      <div className="bg-[#001f1f] border border-[#003434] rounded-2xl p-6 shadow-sm relative">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#003434] to-[#70BF4B] flex items-center justify-center shrink-0 shadow-lg shadow-[#70BF4B]/10">
            <span className="text-[#D0F255] font-bold text-xl">{(client.legal_name || client.email || "?")[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-xl font-bold tracking-tight truncate">{client.legal_name || client.email || "Unknown Client"}</h1>
            <p className="text-zinc-500 text-sm mt-0.5">{client.email || "—"}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Badge label={client.status || 'pending'} colorMap={STATUS_COLOR} />
            <Badge label={String(client.section_m?.risk_profile || '') || 'Green'} colorMap={RISK_COLOR} />
          </div>
        </div>
        {mrr != null && mrr !== "" && (
          <p className="text-[#D0F255] font-mono text-sm mt-4">₹{Number(mrr).toLocaleString("en-IN")}/mo</p>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all focus:outline-none ${
              activeTab === i
                ? "bg-[#003434] text-[#D0F255] border border-[#70BF4B]/40 shadow-inner"
                : "text-zinc-500 hover:text-zinc-200 hover:bg-[#001f1f] border border-transparent"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-in fade-in duration-300">
        {activeTab === 0 && <OverviewTab client={client} />}
        {activeTab === 1 && <BrandKitTab client={client} />}
        {activeTab === 2 && <SocialTab client={client} />}
        {activeTab === 3 && <OnboardingTab client={client} />}
        {activeTab === 4 && <CalendarTab entries={contentCalendar} onUpdate={() => mutate()} />}
        {activeTab === 5 && <LegalTab client={client} />}
        {activeTab === 6 && <NotesTab client={client} />}
        {activeTab === 7 && <AccessCredentialsTab client={client} />}
        {activeTab === 8 && <PackageTab client={client} />}
      </div>
    </div>
  )
}
