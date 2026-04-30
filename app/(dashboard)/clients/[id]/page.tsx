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
  // Content Generator fields (top-level columns)
  platforms_enabled: string[] | null
  posts_per_week: Record<string, number> | null
  content_mix: Record<string, number> | null
  reeval_mode: string | null
  content_auto_gen: boolean | null
  context_pack_generated_at: string | null
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

type ClientUser = {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'editor' | 'viewer'
  status: 'invited' | 'active' | 'suspended'
  password_set_at: string | null
  created_at: string
}

function AuthorizedUsersCard({ clientId }: { clientId: string }) {
  const { data, mutate, isLoading } = useSWR<{ users: ClientUser[] }>(
    `/api/clients/${clientId}/invite-user`,
    fetcher
  )
  const users = data?.users ?? []

  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState<ClientUser['role']>('editor')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)

  async function sendInvite(payload: { email: string; full_name?: string; role?: ClientUser['role'] }) {
    const res = await fetch(`/api/clients/${clientId}/invite-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`)
    return json
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true); setFeedback(null)
    try {
      await sendInvite({ email: email.trim(), full_name: fullName.trim() || undefined, role })
      setEmail(""); setFullName(""); setRole('member')
      setFeedback({ kind: 'ok', msg: 'Invite sent' })
      mutate()
    } catch (err) {
      setFeedback({ kind: 'err', msg: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }

  async function handleResend(u: ClientUser) {
    setResendingId(u.id); setFeedback(null)
    try {
      await sendInvite({ email: u.email, full_name: u.full_name ?? undefined, role: u.role })
      setFeedback({ kind: 'ok', msg: `Invite re-sent to ${u.email}` })
      mutate()
    } catch (err) {
      setFeedback({ kind: 'err', msg: err instanceof Error ? err.message : String(err) })
    } finally {
      setResendingId(null)
    }
  }

  function statusLabel(u: ClientUser) {
    if (u.password_set_at) return { text: 'Active', cls: 'bg-[#70BF4B]/15 text-[#70BF4B] border-[#70BF4B]/30' }
    if (u.status === 'suspended') return { text: 'Suspended', cls: 'bg-red-500/15 text-red-400 border-red-500/30' }
    return { text: 'Invited', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
  }

  return (
    <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-[#003434] flex items-center gap-2">
        <div className="w-1 h-4 rounded-full bg-[#70BF4B]" />
        <h3 className="text-white text-sm font-semibold">Authorized Users</h3>
        <span className="text-[10px] text-zinc-500 ml-auto">Client portal access</span>
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <p className="text-zinc-500 text-sm">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="text-zinc-500 text-sm">No users invited yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#003434]">
                  {["Email", "Name", "Role", "Status", ""].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest py-2 pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#003434]/50">
                {users.map(u => {
                  const s = statusLabel(u)
                  const canResend = !u.password_set_at && u.status !== 'suspended'
                  return (
                    <tr key={u.id}>
                      <td className="py-2 pr-3 text-white">{u.email}</td>
                      <td className="py-2 pr-3 text-zinc-300">{u.full_name || <span className="text-zinc-600">—</span>}</td>
                      <td className="py-2 pr-3 text-zinc-300 capitalize">{u.role}</td>
                      <td className="py-2 pr-3">
                        <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${s.cls}`}>{s.text}</span>
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {canResend && (
                          <button
                            type="button"
                            disabled={resendingId === u.id}
                            onClick={() => handleResend(u)}
                            className="text-xs text-[#70BF4B] hover:text-[#D0F255] disabled:opacity-50"
                          >
                            {resendingId === u.id ? 'Sending…' : 'Resend invite'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 pt-4 border-t border-[#003434]/60 grid grid-cols-1 md:grid-cols-[1.4fr_1fr_0.7fr_auto] gap-2 items-end">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-[#001a1a] text-white text-sm border border-[#003434] focus:border-[#70BF4B]/60 outline-none rounded px-2 py-1.5"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Full name (optional)</label>
            <input
              type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full bg-[#001a1a] text-white text-sm border border-[#003434] focus:border-[#70BF4B]/60 outline-none rounded px-2 py-1.5"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Role</label>
            <select
              value={role} onChange={e => setRole(e.target.value as ClientUser['role'])}
              className="w-full bg-[#001a1a] text-white text-sm border border-[#003434] focus:border-[#70BF4B]/60 outline-none rounded px-2 py-1.5"
            >
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="bg-[#70BF4B] hover:bg-[#D0F255] text-[#003434] text-sm font-semibold px-4 py-1.5 rounded disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send invite'}
          </button>
        </form>

        {feedback && (
          <p className={`mt-3 text-xs ${feedback.kind === 'ok' ? 'text-[#70BF4B]' : 'text-red-400'}`}>
            {feedback.msg}
          </p>
        )}
      </div>
    </div>
  )
}

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

      <AuthorizedUsersCard clientId={client.id} />

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

// ─── Tab: Content Generator ───────────────────────────────────────────────────

const CONTENT_PLATFORMS = [
  { id: 'instagram',  label: 'IG' },
  { id: 'facebook',  label: 'FB' },
  { id: 'linkedin',  label: 'LinkedIn' },
  { id: 'twitter',   label: 'X' },
  { id: 'youtube',   label: 'YT' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'quora',     label: 'Quora' },
  { id: 'blog',      label: 'Blog' },
] as const

const DEFAULT_POSTS_PER_WEEK: Record<string, number> = {
  instagram: 4, linkedin: 3, twitter: 5,
  facebook: 3, youtube: 1, pinterest: 2, quora: 2, blog: 1,
}

const DEFAULT_CONTENT_MIX: Record<string, number> = {
  educational: 30, engagement: 30, promotional: 20, storytelling: 20,
}

type GenLog = {
  id: string
  generated_at: string
  status: string
  posts_generated?: number | null
  errors?: string | null
  platforms?: string[] | null
}

function MixSlider({
  label, value, color, onChange
}: { label: string; value: number; color: string; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        <span className="text-xs font-mono text-zinc-300 tabular-nums w-9 text-right">{value}%</span>
      </div>
      <div className="relative h-2 bg-[#003434] rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
        <input
          type="range"
          min={0} max={100} step={5}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  )
}

function ContentGeneratorTab({ client }: { client: SupabaseClient }) {
  const [reevalMode, setReevalMode] = useState<'Auto Mode' | 'Review Mode'>(
    (client.reeval_mode as 'Auto Mode' | 'Review Mode') ?? 'Auto Mode'
  )
  const [autoGen, setAutoGen] = useState<boolean>(client.content_auto_gen ?? false)
  const [platforms, setPlatforms] = useState<string[]>(client.platforms_enabled ?? ['instagram', 'linkedin', 'twitter'])
  const [postsPerWeek, setPostsPerWeek] = useState<Record<string, number>>(
    client.posts_per_week ?? DEFAULT_POSTS_PER_WEEK
  )
  const [contentMix, setContentMix] = useState<Record<string, number>>(
    client.content_mix ?? DEFAULT_CONTENT_MIX
  )
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [logs, setLogs] = useState<GenLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  // Fetch logs on mount
  useEffect(() => {
    setLogsLoading(true)
    fetch(`/api/content-generator/logs?client_id=${client.id}`)
      .then(r => r.json())
      .then(d => setLogs(d.logs ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false))
  }, [client.id])

  async function saveSettings(patch: Partial<{
    reeval_mode: string
    content_auto_gen: boolean
    platforms_enabled: string[]
    posts_per_week: Record<string, number>
    content_mix: Record<string, number>
  }>) {
    await fetch('/api/content-generator/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: client.id, ...patch }),
    })
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  function togglePlatform(id: string) {
    const next = platforms.includes(id)
      ? platforms.filter(p => p !== id)
      : [...platforms, id]
    setPlatforms(next)
    saveSettings({ platforms_enabled: next })
  }

  function updatePostsPerWeek(platform: string, val: number) {
    const next = { ...postsPerWeek, [platform]: val }
    setPostsPerWeek(next)
    saveSettings({ posts_per_week: next })
  }

  function updateMix(key: string, val: number) {
    const next = { ...contentMix, [key]: val }
    setContentMix(next)
    saveSettings({ content_mix: next })
  }

  const mixTotal = Object.values(contentMix).reduce((s, v) => s + v, 0)

  async function handleGenerate() {
    setGenerating(true)
    setGenResult(null)
    try {
      const res = await fetch('/api/content-generator/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client.id }),
      })
      const json = await res.json()
      if (res.ok) {
        setGenResult({ ok: true, msg: 'Content generation triggered successfully!' })
        // Refresh logs
        fetch(`/api/content-generator/logs?client_id=${client.id}`)
          .then(r => r.json())
          .then(d => setLogs(d.logs ?? []))
          .catch(() => {})
      } else {
        setGenResult({ ok: false, msg: json.error ?? 'Generation failed.' })
      }
    } catch {
      setGenResult({ ok: false, msg: 'Network error. Please retry.' })
    } finally {
      setGenerating(false)
    }
  }

  const MIX_COLORS: Record<string, string> = {
    educational: '#70BF4B',
    engagement:  '#D0F255',
    promotional: '#38bdf8',
    storytelling: '#f59e0b',
  }

  return (
    <div className="space-y-4">

      {/* Mode toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Reeval Mode toggle */}
        <div className="bg-[#001f1f] border border-[#003434] rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-white text-sm font-semibold">Review Mode</p>
            <p className="text-zinc-500 text-xs mt-0.5">Review posts before publishing vs. auto-approve</p>
          </div>
          <button
            onClick={() => {
              const next = reevalMode === 'Auto Mode' ? 'Review Mode' : 'Auto Mode'
              setReevalMode(next)
              saveSettings({ reeval_mode: next })
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors ${
              reevalMode === 'Review Mode'
                ? 'border-[#70BF4B] bg-[#70BF4B]/20'
                : 'border-zinc-600 bg-zinc-800'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full mt-0.5 transition-transform ${
              reevalMode === 'Review Mode'
                ? 'translate-x-5 bg-[#70BF4B]'
                : 'translate-x-0.5 bg-zinc-500'
            }`} />
          </button>
        </div>

        {/* Auto Generate toggle */}
        <div className="bg-[#001f1f] border border-[#003434] rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-white text-sm font-semibold">Auto-generate Weekly</p>
            <p className="text-zinc-500 text-xs mt-0.5">Automatically generate every Monday at 6 AM</p>
          </div>
          <button
            onClick={() => {
              const next = !autoGen
              setAutoGen(next)
              saveSettings({ content_auto_gen: next })
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors ${
              autoGen
                ? 'border-[#70BF4B] bg-[#70BF4B]/20'
                : 'border-zinc-600 bg-zinc-800'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full mt-0.5 transition-transform ${
              autoGen ? 'translate-x-5 bg-[#70BF4B]' : 'translate-x-0.5 bg-zinc-500'
            }`} />
          </button>
        </div>
      </div>

      {/* Platform multi-select */}
      <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#003434] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-[#70BF4B]" />
            <h3 className="text-white text-sm font-semibold">Platforms</h3>
          </div>
          {settingsSaved && <span className="text-[#70BF4B] text-xs font-bold">✓ Saved</span>}
        </div>
        <div className="p-4 flex flex-wrap gap-2">
          {CONTENT_PLATFORMS.map(({ id, label }) => {
            const active = platforms.includes(id)
            return (
              <button
                key={id}
                onClick={() => togglePlatform(id)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  active
                    ? 'bg-[#70BF4B]/15 border-[#70BF4B]/50 text-[#D0F255]'
                    : 'bg-transparent border-[#003434] text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Posts per week (only active platforms) */}
      {platforms.length > 0 && (
        <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#003434] flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-[#D0F255]" />
            <h3 className="text-white text-sm font-semibold">Posts Per Week</h3>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {platforms.map(pid => {
              const platform = CONTENT_PLATFORMS.find(p => p.id === pid)
              return (
                <div key={pid} className="bg-[#001a1a] border border-[#003434] rounded-lg p-3 space-y-2">
                  <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-widest">
                    {platform?.label ?? pid}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updatePostsPerWeek(pid, Math.max(0, (postsPerWeek[pid] ?? DEFAULT_POSTS_PER_WEEK[pid] ?? 3) - 1))}
                      className="w-6 h-6 rounded-md bg-[#003434] text-zinc-400 hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
                    >−</button>
                    <span className="flex-1 text-center text-white font-mono text-sm">
                      {postsPerWeek[pid] ?? DEFAULT_POSTS_PER_WEEK[pid] ?? 3}
                    </span>
                    <button
                      onClick={() => updatePostsPerWeek(pid, Math.min(14, (postsPerWeek[pid] ?? DEFAULT_POSTS_PER_WEEK[pid] ?? 3) + 1))}
                      className="w-6 h-6 rounded-md bg-[#003434] text-zinc-400 hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
                    >+</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Content mix sliders */}
      <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#003434] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-[#38bdf8]" />
            <h3 className="text-white text-sm font-semibold">Content Mix</h3>
          </div>
          <span className={`text-xs font-mono ${
            mixTotal === 100 ? 'text-[#70BF4B]' : 'text-yellow-400'
          }`}>
            {mixTotal}% {mixTotal !== 100 && '⚠️'}
          </span>
        </div>
        <div className="p-5 space-y-4">
          {Object.entries(contentMix).map(([key, val]) => (
            <MixSlider
              key={key}
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              value={val}
              color={MIX_COLORS[key] ?? '#70BF4B'}
              onChange={v => updateMix(key, v)}
            />
          ))}
          <div className="flex gap-2 pt-1">
            {Object.entries(contentMix).map(([key, val]) => (
              <div
                key={key}
                className="rounded-sm h-2 transition-all"
                style={{ flex: val, backgroundColor: MIX_COLORS[key] ?? '#70BF4B', minWidth: val > 0 ? 4 : 0 }}
                title={`${key}: ${val}%`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={generating || platforms.length === 0}
        className={`w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-3 transition-all border ${
          generating || platforms.length === 0
            ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed'
            : 'bg-[#70BF4B]/10 border-[#70BF4B]/50 text-[#D0F255] hover:bg-[#70BF4B]/20 hover:border-[#70BF4B] shadow-lg shadow-[#70BF4B]/5 active:scale-[0.99]'
        }`}
      >
        {generating ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Triggering generation…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Next 7 Days Now
          </>
        )}
      </button>

      {/* Result banner */}
      {genResult && (
        <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 border ${
          genResult.ok
            ? 'bg-[#70BF4B]/10 border-[#70BF4B]/30 text-[#70BF4B]'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <span>{genResult.ok ? '✓' : '✕'}</span>
          <span>{genResult.msg}</span>
        </div>
      )}

      {/* Last 5 generation logs */}
      <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#003434] flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-zinc-500" />
          <h3 className="text-white text-sm font-semibold">Generation Log</h3>
          <span className="text-zinc-600 text-xs ml-auto">Last 5 runs</span>
        </div>
        {logsLoading ? (
          <div className="px-5 py-6 flex items-center gap-2 text-zinc-600">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-sm">Loading…</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="px-5 py-8 text-center text-zinc-600 text-sm">No generation runs yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#003434]/60">
                  {['Date', 'Posts', 'Platforms', 'Status', 'Errors'].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#003434]/40">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-[#003434]/20 transition-colors">
                    <td className="px-4 py-3 text-zinc-300 text-sm font-mono whitespace-nowrap">
                      {new Date(log.generated_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-sm">
                      {log.posts_generated ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(log.platforms ?? []).map(p => (
                          <span key={p} className="px-1.5 py-0.5 rounded text-[10px] bg-[#003434] text-zinc-400">{p}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                        log.status === 'success'
                          ? 'bg-[#70BF4B]/15 text-[#70BF4B] border-[#70BF4B]/30'
                          : 'bg-red-500/15 text-red-400 border-red-500/30'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-red-400 text-xs max-w-[160px] truncate">
                      {log.errors ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Context Pack ───────────────────────────────────────────────────────

type ContextSection = {
  title: string
  color: string
  content: Record<string, unknown>
}

function AccordionSection({ title, color, content }: ContextSection) {
  const [open, setOpen] = useState(false)
  const entries = Object.entries(content).filter(([, v]) => v !== null && v !== undefined && v !== '')

  return (
    <div className="bg-[#001a1a] border border-[#003434] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-[#003434]/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-white text-sm font-semibold">{title}</span>
          {entries.length > 0 && (
            <span className="text-[10px] text-zinc-600 font-mono">{entries.length} fields</span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-[#003434] px-5 py-4 space-y-2">
          {entries.length === 0 ? (
            <p className="text-zinc-600 text-xs italic">No data in this section yet.</p>
          ) : (
            entries.map(([key, val]) => (
              <div key={key} className="flex flex-col sm:flex-row gap-1">
                <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:w-44 shrink-0 pt-0.5">
                  {key.replace(/_/g, ' ')}
                </dt>
                <dd className="text-sm text-zinc-300 flex-1 min-w-0 break-words">
                  {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                </dd>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function ContextPackTab({ client }: { client: SupabaseClient }) {
  const [generating, setGenerating] = useState(false)
  const [genStatus, setGenStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(client.context_pack_generated_at ?? null)
  const [copied, setCopied] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const sA = client.section_a ?? {}
  const sC = client.section_c ?? {}
  const sG = client.section_g ?? {}
  const sI = client.section_i ?? {}

  // ── Computed sections ──────────────────────────────────────────────────────
  const businessOverview: Record<string, unknown> = {
    business_name:   sA.business_name ?? client.legal_name,
    industry:        sA.industry,
    website:         sA.website,
    founded:         sA.founded,
    team_size:       sA.team_size,
    description:     sA.description ?? sA.about,
  }

  const brandIdentity: Record<string, unknown> = {
    brand_name:      sC.brand_name,
    tagline:         sC.tagline,
    primary_color:   (sC.colors as Record<string, unknown>)?.primary,
    secondary_color: (sC.colors as Record<string, unknown>)?.secondary,
    typography:      sC.typography,
    brand_story:     sC.brand_story,
    tone:            sC.tone,
  }

  const targetAudience: Record<string, unknown> = {
    age_range:       sG.age_range,
    gender:          sG.gender,
    location:        sG.location,
    income:          sG.income,
    interests:       sG.interests,
    pain_points:     sG.pain_points,
    buying_behavior: sG.buying_behavior,
  }

  const toneOfVoice: Record<string, unknown> = {
    tone:           sC.tone,
    words_to_use:   (sC.voice as Record<string, unknown>)?.words_to_use,
    words_to_avoid: (sC.voice as Record<string, unknown>)?.words_to_avoid,
    brand_story:    sC.brand_story,
  }

  // Computed from platforms_enabled + content_mix
  const contentPillars: Record<string, unknown> = {
    platforms:        (client.platforms_enabled ?? []).join(', ') || 'Not set',
    educational_pct:  client.content_mix?.educational ?? 30,
    engagement_pct:   client.content_mix?.engagement ?? 30,
    promotional_pct:  client.content_mix?.promotional ?? 20,
    storytelling_pct: client.content_mix?.storytelling ?? 20,
    posts_per_week:   JSON.stringify(client.posts_per_week ?? {}),
  }

  const dontList: Record<string, unknown> = {
    words_to_avoid:     (sC.voice as Record<string, unknown>)?.words_to_avoid,
    disallowed_topics:  sI.disallowed_topics,
    regulated_industry: sI.regulated_industry,
    nda_status:         sI.nda_status,
    dos:                sC.tone ? `Maintain ${sC.tone} tone at all times` : undefined,
    donts:              sI.disallowed_topics ? `Avoid: ${sI.disallowed_topics}` : undefined,
  }

  const SECTIONS: ContextSection[] = [
    { title: 'Business Overview',   color: '#70BF4B', content: businessOverview },
    { title: 'Brand Identity',      color: '#D0F255', content: brandIdentity },
    { title: 'Target Audience',     color: '#38bdf8', content: targetAudience },
    { title: 'Tone of Voice',       color: '#f59e0b', content: toneOfVoice },
    { title: 'Content Pillars',     color: '#a78bfa', content: contentPillars },
    { title: 'Do / Don\'t List',    color: '#f87171', content: dontList },
  ]

  // ── JSON payload for "Copy JSON" ───────────────────────────────────────────
  const jsonPayload = {
    client_id:       client.id,
    client_name:     client.legal_name ?? client.email,
    generated_at:    generatedAt,
    business_overview:  businessOverview,
    brand_identity:     brandIdentity,
    target_audience:    targetAudience,
    tone_of_voice:      toneOfVoice,
    content_pillars:    contentPillars,
    do_dont_list:       dontList,
  }

  // ── Markdown export ────────────────────────────────────────────────────────
  function buildMarkdown(): string {
    const lines: string[] = [
      `# Context Pack — ${client.legal_name ?? client.email}`,
      `> Generated: ${generatedAt ? new Date(generatedAt).toLocaleString('en-IN') : 'Not yet'}`,
      '',
    ]
    for (const sec of SECTIONS) {
      lines.push(`## ${sec.title}`, '')
      const entries = Object.entries(sec.content).filter(([, v]) => v !== null && v !== undefined && v !== '')
      if (entries.length === 0) {
        lines.push('_No data available._', '')
      } else {
        for (const [k, v] of entries) {
          lines.push(`**${k.replace(/_/g, ' ')}:** ${typeof v === 'object' ? JSON.stringify(v) : v}`, '')
        }
      }
    }
    return lines.join('\n')
  }

  function handleDownloadMarkdown() {
    const md = buildMarkdown()
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `context-pack-${(client.legal_name ?? client.email ?? client.id).replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleCopyJson() {
    navigator.clipboard.writeText(JSON.stringify(jsonPayload, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleGenerate() {
    setGenerating(true)
    setGenStatus(null)
    try {
      const res = await fetch('/api/contexts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client.id }),
      })
      const json = await res.json()
      if (res.ok) {
        setGeneratedAt(json.generated_at)
        setGenStatus({ ok: true, msg: 'Context pack generated successfully!' })
      } else {
        setGenStatus({ ok: false, msg: json.error ?? 'Generation failed.' })
      }
    } catch {
      setGenStatus({ ok: false, msg: 'Network error. Please retry.' })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* Status + primary actions */}
      <div className="bg-[#001f1f] border border-[#003434] rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Status</p>
            {generatedAt ? (
              <p className="text-sm text-[#70BF4B] font-medium">
                ✓ Generated {new Date(generatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            ) : (
              <p className="text-sm text-zinc-500 italic">Not generated yet</p>
            )}
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all shrink-0 ${
              generating
                ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed'
                : 'bg-[#70BF4B]/10 border-[#70BF4B]/50 text-[#D0F255] hover:bg-[#70BF4B]/20 hover:border-[#70BF4B]'
            }`}
          >
            {generating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Generate Context Pack
              </>
            )}
          </button>
        </div>

        {genStatus && (
          <div className={`mt-3 rounded-lg px-3 py-2 text-sm flex items-center gap-2 border ${
            genStatus.ok
              ? 'bg-[#70BF4B]/10 border-[#70BF4B]/30 text-[#70BF4B]'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <span>{genStatus.ok ? '✓' : '✕'}</span>
            <span>{genStatus.msg}</span>
          </div>
        )}
      </div>

      {/* Accordion sections */}
      <div className="space-y-2">
        {SECTIONS.map(sec => (
          <AccordionSection key={sec.title} {...sec} />
        ))}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={handleDownloadMarkdown}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border border-[#003434] bg-[#001a1a] text-zinc-300 hover:text-white hover:border-zinc-500 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Markdown
        </button>

        <button
          onClick={handleCopyJson}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
            copied
              ? 'border-[#70BF4B]/50 bg-[#70BF4B]/10 text-[#70BF4B]'
              : 'border-[#003434] bg-[#001a1a] text-zinc-300 hover:text-white hover:border-zinc-500'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border border-[#003434] bg-[#001a1a] text-zinc-300 hover:text-white hover:border-zinc-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Re-generate
        </button>

        <button
          onClick={() => setHistoryOpen(h => !h)}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
            historyOpen
              ? 'border-[#70BF4B]/40 bg-[#003434] text-[#D0F255]'
              : 'border-[#003434] bg-[#001a1a] text-zinc-300 hover:text-white hover:border-zinc-500'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          View History
        </button>
      </div>

      {/* History panel (best-effort) */}
      {historyOpen && (
        <ContextPackHistory clientId={client.id} />
      )}
    </div>
  )
}

function ContextPackHistory({ clientId }: { clientId: string }) {
  const [history, setHistory] = useState<Array<{ id: string; generated_at: string }>>([]) 
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/contexts/history?client_id=${clientId}`)
      .then(r => r.json())
      .then(d => setHistory(d.history ?? []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [clientId])

  return (
    <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[#003434] flex items-center gap-2">
        <div className="w-1 h-4 rounded-full bg-zinc-500" />
        <h3 className="text-white text-sm font-semibold">Generation History</h3>
      </div>
      <div className="px-5 py-4">
        {loading ? (
          <p className="text-zinc-600 text-sm">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-zinc-600 text-sm italic">No history entries found. History is recorded after the first generation.</p>
        ) : (
          <ul className="space-y-2">
            {history.map(h => (
              <li key={h.id} className="flex items-center gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-[#70BF4B] shrink-0" />
                <span className="text-zinc-300 font-mono">
                  {new Date(h.generated_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </li>
            ))}
          </ul>
        )}
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
  "Overview", "Brand Kit", "Social Accounts", "Onboarding", "Content Calendar", "Legal", "Internal Notes", "Access & Credentials", "Package & Project", "Content Generator", "Context Pack"
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
        {activeTab === 9  && <ContentGeneratorTab client={client} />}
        {activeTab === 10 && <ContextPackTab client={client} />}
      </div>
    </div>
  )
}
