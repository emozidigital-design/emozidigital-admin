"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import useSWR from "swr"
import Link from "next/link"
import { useClientUpdate } from "@/lib/useClientUpdate"
import { exportToXLSX, type ExportSheet } from "@/lib/exportCSV"

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = Record<string, unknown>

type ClientRow = {
  id: string
  email: string
  legal_name: string | null
  status: string | null
  current_step: number | null
  created_at: string | null
  section_a: Section | null
  section_b: Section | null
  section_c: Section | null
  section_d: Section | null
  section_e: Section | null
  section_f: Section | null
  section_g: Section | null
  section_h: Section | null
  section_i: Section | null
  section_j: Section | null
  section_k: Section | null
  section_l: Section | null
  section_m: Section | null
  section_notes: string | null
}

type CalendarEntry = {
  id: string
  title?: string
  content_type?: string
  platform?: string
  status?: string
  scheduled_date?: string | null
}

type ApiResponse = {
  client: ClientRow
  contentCalendar: CalendarEntry[]
  error?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  if (v == null) return ""
  return String(v)
}

function humanize(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

function todayStr() {
  return new Date().toISOString().split("T")[0].replace(/-/g, "")
}

function computeRenewalDate(contractStart: string, months = 12): string {
  const d = new Date(contractStart)
  if (isNaN(d.getTime())) return ""
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split("T")[0]
}

function sectionToRows(sec: Section | null): Record<string, string>[] {
  if (!sec || Object.keys(sec).length === 0) return []
  return Object.entries(sec).map(([field, value]) => ({
    Field: humanize(field),
    Value: value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value),
  }))
}

const SECTION_SHEET_NAMES: Record<string, string> = {
  section_a: "Overview — Business Info",
  section_b: "Overview — Contacts",
  section_c: "Brand Kit — Colors & Type",
  section_d: "Brand Kit — Voice",
  section_e: "Social Accounts",
  section_f: "Goals & KPIs",
  section_g: "Pain Points",
  section_h: "Competitors",
  section_i: "Content Preferences",
  section_j: "Legal & Compliance",
  section_k: "Agreement",
  section_l: "Credentials",
  section_m: "Package & Revenue",
}

function buildExportSheets(client: ClientRow): ExportSheet[] {
  const sheets: ExportSheet[] = []

  // Summary sheet
  sheets.push({
    name: "Summary",
    rows: [
      { Field: "ID",           Value: client.id },
      { Field: "Legal Name",   Value: client.legal_name ?? "" },
      { Field: "Email",        Value: client.email ?? "" },
      { Field: "Status",       Value: client.status ?? "" },
      { Field: "Current Step", Value: str(client.current_step) },
      { Field: "Created At",   Value: client.created_at ?? "" },
      { Field: "Package",      Value: str(client.section_m?.package) },
      { Field: "MRR (₹)",      Value: str(client.section_m?.monthly_value) },
      { Field: "Assigned AM",  Value: str(client.section_m?.assigned_am) },
      { Field: "Risk Profile", Value: str(client.section_m?.risk_profile) },
      { Field: "Payment Status", Value: str(client.section_m?.payment_status) },
      { Field: "Contract Start", Value: str(client.section_m?.contract_start) },
      { Field: "Renewal Date",   Value: str(client.section_m?.renewal_date) },
    ],
  })

  // One sheet per section
  const sectionKeys = ["a","b","c","d","e","f","g","h","i","j","k","l","m"] as const
  for (const p of sectionKeys) {
    const key  = `section_${p}` as keyof ClientRow
    const name = SECTION_SHEET_NAMES[key] ?? `Section ${p.toUpperCase()}`
    const rows = sectionToRows(client[key] as Section | null)
    if (rows.length > 0) sheets.push({ name, rows })
  }

  // Notes sheet
  if (client.section_notes) {
    sheets.push({
      name: "Internal Notes",
      rows: [{ Field: "Notes", Value: client.section_notes }],
    })
  }

  return sheets
}

// ─── Shared UI ───────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/5 ${className}`} />
}

const STATUS_COLOR: Record<string, string> = {
  active:      "bg-[#70BF4B]/15 text-[#70BF4B] border-[#70BF4B]/30",
  draft:       "bg-zinc-700/30 text-zinc-400 border-zinc-600/30",
  inactive:    "bg-zinc-700/30 text-zinc-400 border-zinc-600/30",
  pending:     "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  completed:   "bg-sky-500/15 text-sky-400 border-sky-500/30",
  in_progress: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  blocked:     "bg-red-500/15 text-red-400 border-red-500/30",
}
const RISK_COLOR: Record<string, string> = {
  Low:    "bg-[#D0F255]/10 text-[#D0F255] border-[#D0F255]/25",
  Medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  High:   "bg-red-500/15 text-red-400 border-red-500/30",
}

function Badge({ label, colorMap }: { label: string; colorMap: Record<string, string> }) {
  if (!label) return <span className="text-zinc-600">—</span>
  const cls = colorMap[label] ?? colorMap[label.toLowerCase()] ?? "bg-zinc-700/30 text-zinc-400 border-zinc-600/30"
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{label}</span>
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="bg-[#001f1f] border border-[#003434] rounded-xl py-16 flex flex-col items-center text-center gap-3">
      <span className="text-3xl">{icon}</span>
      <p className="text-zinc-500 text-sm">{message}</p>
    </div>
  )
}

function SectionCard({ title, accentColor = "#70BF4B", children }: {
  title: string; accentColor?: string; children: React.ReactNode
}) {
  return (
    <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[#003434] flex items-center gap-2">
        <div className="w-1 h-4 rounded-full" style={{ background: accentColor }} />
        <h3 className="text-white text-sm font-semibold">{title}</h3>
      </div>
      <dl className="px-5 py-1">{children}</dl>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: unknown }) {
  const display = value == null || value === "" ? "—" : String(value)
  return (
    <div className="flex flex-col sm:flex-row gap-1.5 py-2.5 border-b border-[#003434] last:border-0">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:w-36 shrink-0 pt-0.5">{label}</dt>
      <dd className="text-zinc-200 text-sm break-words">{display}</dd>
    </div>
  )
}

// ─── EditableField (click-to-edit) ────────────────────────────────────────────

type InputType = "text" | "email" | "number" | "date" | "color" | "textarea" | "select" | "tel" | "url"

function SaveIndicator({ saving, saved, error }: { saving: boolean; saved: boolean; error: string | null }) {
  if (saving) return <span className="text-[10px] text-zinc-500 whitespace-nowrap">saving…</span>
  if (saved)  return <span className="text-[10px] text-[#70BF4B] whitespace-nowrap">✓ saved</span>
  if (error)  return <span className="text-[10px] text-red-400 whitespace-nowrap cursor-help" title={error}>✗ error</span>
  return null
}

function EditableField({
  label, value, section, field, inputType = "text", clientId, options, computeSaveData,
}: {
  label: string
  value: string
  section: string
  field: string
  inputType?: InputType
  clientId: string
  options?: string[]
  computeSaveData?: (v: string) => Record<string, unknown>
}) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal]     = useState(value)
  const { update, saving, saved, error } = useClientUpdate(clientId, section)
  const elRef = useRef<HTMLElement | null>(null)

  useEffect(() => setLocal(value), [value])

  useEffect(() => {
    if (editing && elRef.current) {
      (elRef.current as HTMLElement & { select?: () => void }).focus()
      ;(elRef.current as HTMLElement & { select?: () => void }).select?.()
    }
  }, [editing])

  function commit() {
    setEditing(false)
    if (local === value) return
    const data = computeSaveData
      ? computeSaveData(local)
      : { [field]: inputType === "number" ? (local === "" ? null : Number(local)) : local }
    update(data)
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && inputType !== "textarea") commit()
    if (e.key === "Escape") { setLocal(value); setEditing(false) }
  }

  const isHex = /^#[0-9a-fA-F]{3,6}$/.test(local)

  const displayEl = (
    <button
      onClick={() => setEditing(true)}
      className="flex-1 text-left min-w-0 group/btn focus-visible:outline-none"
    >
      {inputType === "color" && isHex ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-sm border border-white/10 shrink-0" style={{ background: local }} />
          <span className="font-mono text-sm text-zinc-200 group-hover/btn:text-white transition-colors">{local}</span>
        </span>
      ) : (
        <span className="text-zinc-200 text-sm group-hover/btn:text-white transition-colors">
          {local || <span className="text-zinc-600">—</span>}
        </span>
      )}
    </button>
  )

  let editEl: React.ReactNode
  if (inputType === "textarea") {
    editEl = (
      <textarea
        ref={el => { elRef.current = el }}
        value={local}
        rows={3}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        className="flex-1 bg-[#003434]/70 text-white text-sm rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-[#70BF4B]/40 resize-none"
      />
    )
  } else if (inputType === "select" && options) {
    editEl = (
      <select
        ref={el => { elRef.current = el }}
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        className="flex-1 bg-[#003434] text-white text-sm rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-[#70BF4B]/40"
      >
        <option value="">— select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  } else if (inputType === "color") {
    editEl = (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <input
          type="color"
          value={isHex ? local : "#000000"}
          onChange={e => setLocal(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0 shrink-0"
          title="Pick a colour"
        />
        <input
          ref={el => { elRef.current = el }}
          type="text"
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={onKey}
          placeholder="#000000"
          className="flex-1 bg-[#003434]/70 text-white text-sm rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-[#70BF4B]/40 font-mono min-w-0"
        />
      </div>
    )
  } else {
    editEl = (
      <input
        ref={el => { elRef.current = el }}
        type={inputType}
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        className="flex-1 bg-[#003434]/70 text-white text-sm rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-[#70BF4B]/40"
      />
    )
  }

  return (
    <div className="flex flex-col sm:flex-row gap-1.5 py-3 border-b border-[#003434] last:border-0 group/field">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:w-36 shrink-0 pt-0.5">
        {label}
      </dt>
      <div className="flex-1 flex items-start gap-2 min-w-0">
        {editing ? editEl : displayEl}
        <div className="shrink-0 w-14 flex items-center justify-end pt-0.5">
          <SaveIndicator saving={saving} saved={saved} error={error} />
          {!editing && !saving && !saved && !error && (
            <span className="text-[10px] text-zinc-700 opacity-0 group-hover/field:opacity-100 transition-opacity select-none">
              edit
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab 1: Overview ──────────────────────────────────────────────────────────

function OverviewTab({ client }: { client: ClientRow }) {
  const a = client.section_a ?? {}
  const b = client.section_b ?? {}
  const id = client.id

  const knownB = ["email","phone","founder_name","co_founder","whatsapp","linkedin","position"]
  const extraB = Object.keys(b).filter(k => !knownB.includes(k))

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <SectionCard title="Business Info">
        <EditableField label="Legal Name"   clientId={id} section="section_a" field="legal_name"  value={str(a.legal_name)}  />
        <EditableField label="Email"        clientId={id} section="section_a" field="email"       value={str(a.email || client.email)} inputType="email" />
        <EditableField label="Phone"        clientId={id} section="section_a" field="phone"       value={str(a.phone)}       inputType="tel" />
        <EditableField label="Industry"     clientId={id} section="section_a" field="industry"    value={str(a.industry)}    />
        <EditableField label="City"         clientId={id} section="section_a" field="city"        value={str(a.city)}        />
        <EditableField label="Website"      clientId={id} section="section_a" field="website"     value={str(a.website)}     inputType="url" />
        <EditableField label="Team Size"    clientId={id} section="section_a" field="team_size"   value={str(a.team_size)}   />
        <EditableField label="Year Founded" clientId={id} section="section_a" field="year_founded" value={str(a.year_founded)} inputType="number" />
      </SectionCard>

      <SectionCard title="Primary Contact" accentColor="#38bdf8">
        <EditableField label="Founder Name"   clientId={id} section="section_b" field="founder_name"  value={str(b.founder_name)}  />
        <EditableField label="Co-founder"     clientId={id} section="section_b" field="co_founder"    value={str(b.co_founder)}    />
        <EditableField label="Contact Email"  clientId={id} section="section_b" field="email"         value={str(b.email)}         inputType="email" />
        <EditableField label="WhatsApp"       clientId={id} section="section_b" field="whatsapp"      value={str(b.whatsapp)}      inputType="tel" />
        <EditableField label="LinkedIn"       clientId={id} section="section_b" field="linkedin"      value={str(b.linkedin)}      />
        <EditableField label="Position"       clientId={id} section="section_b" field="position"      value={str(b.position)}      />
        {extraB.map(k => (
          <EditableField key={k} label={humanize(k)} clientId={id} section="section_b" field={k} value={str(b[k])} />
        ))}
      </SectionCard>

      <SectionCard title="Goals & KPIs" accentColor="#D0F255">
        {client.section_f && Object.keys(client.section_f).length > 0
          ? Object.entries(client.section_f).map(([k, v]) => <InfoRow key={k} label={humanize(k)} value={v} />)
          : <p className="text-zinc-600 text-sm py-4">No goals data yet.</p>}
      </SectionCard>

      <SectionCard title="Pain Points & Competitors" accentColor="#f87171">
        {client.section_g && Object.keys(client.section_g).length > 0
          ? Object.entries(client.section_g).map(([k, v]) => <InfoRow key={k} label={humanize(k)} value={v} />)
          : <p className="text-zinc-600 text-sm py-4">No pain points data yet.</p>}
        {client.section_h && Object.keys(client.section_h).length > 0 && (
          <div className="mt-2 pt-2 border-t border-[#003434]">
            {Object.entries(client.section_h).map(([k, v]) => <InfoRow key={k} label={humanize(k)} value={v} />)}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ─── Tab 2: Brand Kit ─────────────────────────────────────────────────────────

const COLOR_FIELDS = ["color_primary","color_secondary","color_accent","color_background","color_text","brand_color"]

function BrandKitTab({ client }: { client: ClientRow }) {
  const c = client.section_c ?? {}
  const d = client.section_d ?? {}
  const id = client.id

  const knownC = [...COLOR_FIELDS,"brand_colors","fonts","font_primary","font_secondary","brand_tone","logo_url","style_guide_url"]
  const extraC = Object.keys(c).filter(k => !knownC.includes(k))
  const colorHexes = useMemo(() => {
    const raw = str(c.brand_colors)
    return raw.split(/[,\s]+/).filter(s => /^#[0-9a-fA-F]{3,6}$/.test(s))
  }, [c.brand_colors])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SectionCard title="Colours & Typography">
          <EditableField label="Brand Colors"  clientId={id} section="section_c" field="brand_colors"  value={str(c.brand_colors)} />
          {colorHexes.length > 0 && (
            <div className="flex gap-2 py-2 flex-wrap border-b border-[#003434]">
              {colorHexes.map(col => (
                <div key={col} className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-lg border border-white/10" style={{ background: col }} />
                  <span className="text-zinc-600 text-[10px] font-mono">{col}</span>
                </div>
              ))}
            </div>
          )}
          {COLOR_FIELDS.filter(f => c[f] != null || ["color_primary","color_secondary","color_accent"].includes(f)).map(f => (
            <EditableField key={f} label={humanize(f)} clientId={id} section="section_c" field={f} value={str(c[f])} inputType="color" />
          ))}
          <EditableField label="Primary Font"   clientId={id} section="section_c" field="font_primary"   value={str(c.font_primary)}   />
          <EditableField label="Secondary Font"  clientId={id} section="section_c" field="font_secondary" value={str(c.font_secondary)} />
          <EditableField label="Fonts (general)" clientId={id} section="section_c" field="fonts"          value={str(c.fonts)}          />
          <EditableField label="Brand Tone"     clientId={id} section="section_c" field="brand_tone"     value={str(c.brand_tone)}     />
          <EditableField label="Logo URL"       clientId={id} section="section_c" field="logo_url"       value={str(c.logo_url)}       inputType="url" />
          <EditableField label="Style Guide"    clientId={id} section="section_c" field="style_guide_url" value={str(c.style_guide_url)} inputType="url" />
          {extraC.map(k => (
            <EditableField key={k} label={humanize(k)} clientId={id} section="section_c" field={k} value={str(c[k])} />
          ))}
        </SectionCard>

        <SectionCard title="Brand Voice & Positioning" accentColor="#D0F255">
          <EditableField label="Brand Story"     clientId={id} section="section_d" field="brand_story"     value={str(d.brand_story)}     inputType="textarea" />
          <EditableField label="Target Audience" clientId={id} section="section_d" field="target_audience" value={str(d.target_audience)} />
          <EditableField label="Value Prop"      clientId={id} section="section_d" field="value_proposition" value={str(d.value_proposition)} inputType="textarea" />
          <EditableField label="Brand Archetype" clientId={id} section="section_d" field="brand_archetype" value={str(d.brand_archetype)} />
          <EditableField label="Differentiator"  clientId={id} section="section_d" field="differentiator"  value={str(d.differentiator)}  />
          {Object.keys(d).filter(k => !["brand_story","target_audience","value_proposition","brand_archetype","differentiator"].includes(k)).map(k => (
            <EditableField key={k} label={humanize(k)} clientId={id} section="section_d" field={k} value={str(d[k])} />
          ))}
        </SectionCard>
      </div>
    </div>
  )
}

// ─── Tab 3: Social Accounts ───────────────────────────────────────────────────

function SocialRow({
  rowKey, rowValue, clientId, onLocalUpdate,
}: {
  rowKey: string; rowValue: string; clientId: string
  onLocalUpdate: (k: string, v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal]     = useState(rowValue)
  const { update, saving, saved, error } = useClientUpdate(clientId, "section_e")

  useEffect(() => setLocal(rowValue), [rowValue])

  function commit(latestRows: Record<string, string>) {
    setEditing(false)
    update(latestRows)
  }

  return (
    <tr className="hover:bg-[#003434]/30 transition-colors group/row">
      <td className="px-4 py-3 text-zinc-300 text-sm font-medium">{humanize(rowKey)}</td>
      <td className="px-4 py-3">
        {editing ? (
          <input
            autoFocus
            type="text"
            value={local}
            onChange={e => { setLocal(e.target.value); onLocalUpdate(rowKey, e.target.value) }}
            onBlur={() => commit({ [rowKey]: local })}
            onKeyDown={e => {
              if (e.key === "Enter") { commit({ [rowKey]: local }); }
              if (e.key === "Escape") { setLocal(rowValue); setEditing(false) }
            }}
            className="w-full bg-[#003434]/70 text-white text-sm rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-[#70BF4B]/40 font-mono"
          />
        ) : (
          <button onClick={() => setEditing(true)} className="w-full text-left text-zinc-400 text-sm font-mono hover:text-white transition-colors">
            {local || <span className="text-zinc-600">—</span>}
          </button>
        )}
      </td>
      <td className="px-4 py-3 w-16 text-right">
        <SaveIndicator saving={saving} saved={saved} error={error} />
        {!editing && !saving && !saved && !error && (
          <span className="text-[10px] text-zinc-700 opacity-0 group-hover/row:opacity-100 transition-opacity">edit</span>
        )}
      </td>
    </tr>
  )
}

function SocialTab({ client }: { client: ClientRow }) {
  const [rows, setRows] = useState<Array<{ key: string; value: string }>>([])
  const [newKey, setNewKey]   = useState("")
  const [newVal, setNewVal]   = useState("")
  const { update: addRow, saving: addSaving } = useClientUpdate(client.id, "section_e")

  useEffect(() => {
    const e = client.section_e ?? {}
    setRows(Object.entries(e).map(([k, v]) => ({ key: k, value: str(v) })))
  }, [client.section_e])

  function handleLocalUpdate(k: string, v: string) {
    setRows(prev => prev.map(r => r.key === k ? { ...r, value: v } : r))
  }

  function handleAddRow() {
    const key = newKey.trim().toLowerCase().replace(/\s+/g, "_")
    if (!key) return
    const current = Object.fromEntries(rows.map(r => [r.key, r.value]))
    const updated = { ...current, [key]: newVal.trim() }
    addRow(updated)
    setRows(prev => [...prev, { key, value: newVal.trim() }])
    setNewKey("")
    setNewVal("")
  }

  if (rows.length === 0 && !newKey) {
    return (
      <div className="space-y-4">
        <EmptyState icon="📱" message="No social accounts added yet. Add one below." />
        <div className="bg-[#001f1f] border border-[#003434] rounded-xl p-4 flex gap-2 flex-wrap">
          <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Platform (e.g. instagram)" className="flex-1 min-w-32 bg-[#003434] text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#70BF4B]/40" />
          <input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="Handle / URL" className="flex-2 min-w-48 bg-[#003434] text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#70BF4B]/40 font-mono" />
          <button onClick={handleAddRow} disabled={!newKey.trim() || addSaving} className="px-4 py-2 bg-[#70BF4B] hover:bg-[#5faa3e] disabled:opacity-40 text-[#001a1a] font-semibold text-sm rounded-xl transition-colors">
            {addSaving ? "Adding…" : "+ Add"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#003434]">
                <th className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-4 py-3">Platform</th>
                <th className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-4 py-3">Handle / URL</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#003434]/50">
              {rows.map(r => (
                <SocialRow key={r.key} rowKey={r.key} rowValue={r.value} clientId={client.id} onLocalUpdate={handleLocalUpdate} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#001f1f] border border-[#003434] rounded-xl p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">Add Platform</p>
        <div className="flex gap-2 flex-wrap">
          <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Platform name" className="flex-1 min-w-32 bg-[#003434] text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#70BF4B]/40" />
          <input value={newVal} onChange={e => setNewVal(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddRow()} placeholder="Handle / URL" className="flex-2 min-w-48 bg-[#003434] text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#70BF4B]/40 font-mono" />
          <button onClick={handleAddRow} disabled={!newKey.trim() || addSaving} className="px-4 py-2 bg-[#70BF4B] hover:bg-[#5faa3e] disabled:opacity-40 text-[#001a1a] font-semibold text-sm rounded-xl transition-colors">
            {addSaving ? "Adding…" : "+ Add"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab 4: Onboarding Progress ───────────────────────────────────────────────

const SECTION_DEFS = [
  { id: "A", label: "Business Info",        col: "section_a", required: ["legal_name","industry","city","website"] },
  { id: "B", label: "Contact Details",      col: "section_b", required: ["email","phone"] },
  { id: "C", label: "Brand Identity",       col: "section_c", required: ["brand_colors","fonts"] },
  { id: "D", label: "Brand Voice",          col: "section_d", required: ["brand_story","target_audience"] },
  { id: "E", label: "Social Accounts",      col: "section_e", required: [] },
  { id: "F", label: "Goals & KPIs",         col: "section_f", required: [] },
  { id: "G", label: "Pain Points",          col: "section_g", required: [] },
  { id: "H", label: "Competitors",          col: "section_h", required: [] },
  { id: "I", label: "Content Preferences",  col: "section_i", required: [] },
  { id: "J", label: "Legal & Compliance",   col: "section_j", required: [] },
  { id: "K", label: "Agreement",            col: "section_k", required: [] },
  { id: "L", label: "Credentials",          col: "section_l", required: [] },
  { id: "M", label: "Business Meta",        col: "section_m", required: ["package","monthly_value"] },
]

function OnboardingTab({ client }: { client: ClientRow }) {
  const [reminding, setReminding] = useState(false)
  const [reminded, setReminded]   = useState(false)

  async function sendReminder() {
    setReminding(true)
    await fetch(`/api/clients/${client.id}/remind`, { method: "POST" })
    setReminding(false)
    setReminded(true)
    setTimeout(() => setReminded(false), 4000)
  }

  const completed = SECTION_DEFS.filter(s => {
    const data = (client as Record<string, unknown>)[s.col]
    return data && typeof data === "object" && Object.keys(data as object).length > 0
  }).length

  const total = SECTION_DEFS.length
  const pct   = Math.round((completed / total) * 100)

  return (
    <div className="space-y-4">
      <div className="bg-[#001f1f] border border-[#003434] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white font-semibold text-sm">{completed} of {total} sections complete</p>
            <p className="text-zinc-500 text-xs mt-0.5">{pct}% overall progress</p>
          </div>
          <button
            onClick={sendReminder}
            disabled={reminding || reminded}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border transition-all ${
              reminded
                ? "bg-[#70BF4B]/15 text-[#70BF4B] border-[#70BF4B]/30"
                : "bg-[#003434] border-[#70BF4B]/20 hover:border-[#70BF4B]/50 text-zinc-300 hover:text-white"
            }`}
          >
            {reminding ? "Sending…" : reminded ? "✓ Reminder sent" : "Send Reminder"}
          </button>
        </div>
        <div className="w-full bg-[#003434] rounded-full h-2">
          <div
            className="bg-gradient-to-r from-[#003434] via-[#70BF4B] to-[#D0F255] h-2 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {SECTION_DEFS.map(s => {
          const data = (client as Record<string, unknown>)[s.col]
          const hasData = data && typeof data === "object" && Object.keys(data as object).length > 0
          const sectionData = (data ?? {}) as Record<string, unknown>
          const filled  = s.required.filter(k => sectionData[k] != null && sectionData[k] !== "")
          const missing = s.required.filter(k => !sectionData[k] || sectionData[k] === "")
          const pctSec  = s.required.length > 0 ? Math.round((filled.length / s.required.length) * 100) : hasData ? 100 : 0

          return (
            <div key={s.id} className={`bg-[#001f1f] border rounded-xl p-4 ${hasData ? "border-[#70BF4B]/20" : "border-[#003434]"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${hasData ? "bg-[#70BF4B] text-[#001a1a]" : "bg-[#003434] text-zinc-500"}`}>
                    {hasData ? "✓" : s.id}
                  </span>
                  <span className="text-white text-xs font-semibold">{s.label}</span>
                </div>
                <span className={`text-[10px] font-mono ${hasData ? "text-[#70BF4B]" : "text-zinc-700"}`}>{pctSec}%</span>
              </div>
              <div className="w-full bg-[#003434] rounded-full h-1 mb-2">
                <div className="bg-[#70BF4B] h-1 rounded-full transition-all" style={{ width: `${pctSec}%` }} />
              </div>
              {missing.length > 0 && missing.map(k => (
                <p key={k} className="text-red-400/70 text-[10px]">✗ {humanize(k)}</p>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tab 5: Content Calendar ──────────────────────────────────────────────────

const CAL_STATUS: Record<string, string> = {
  draft:     "bg-zinc-700/30 text-zinc-400 border-zinc-600/30",
  scheduled: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  published: "bg-[#70BF4B]/15 text-[#70BF4B] border-[#70BF4B]/30",
  review:    "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
}

function CalendarTab({ entries }: { entries: CalendarEntry[] }) {
  if (entries.length === 0) {
    return <EmptyState icon="📅" message="No content calendar entries for this client yet." />
  }
  return (
    <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#003434]">
              {["Title","Type","Platform","Status","Scheduled Date"].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-4 py-3.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#003434]/50">
            {entries.map(e => (
              <tr key={e.id} className="hover:bg-[#003434]/30 transition-colors">
                <td className="px-4 py-3.5 text-white text-sm font-medium">{e.title || "—"}</td>
                <td className="px-4 py-3.5 text-zinc-300 text-sm">{e.content_type || "—"}</td>
                <td className="px-4 py-3.5 text-zinc-400 text-sm">{e.platform || "—"}</td>
                <td className="px-4 py-3.5"><Badge label={str(e.status)} colorMap={CAL_STATUS} /></td>
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

function LegalTab({ client }: { client: ClientRow }) {
  const i = client.section_i ?? {}
  const j = client.section_j ?? {}
  const id = client.id

  const knownI = ["content_type_preferences","posting_frequency","platform_priority","content_restrictions","content_tone"]
  const knownJ = ["regulated_industry","disallowed_topics","disclaimer_status","nda_status","compliance_notes"]

  return (
    <div className="space-y-4">
      <SectionCard title="Content Preferences (Section I)" accentColor="#a78bfa">
        <EditableField label="Content Types"      clientId={id} section="section_i" field="content_type_preferences" value={str(i.content_type_preferences)} />
        <EditableField label="Posting Frequency"  clientId={id} section="section_i" field="posting_frequency"  value={str(i.posting_frequency)}  />
        <EditableField label="Platform Priority"  clientId={id} section="section_i" field="platform_priority"  value={str(i.platform_priority)}  />
        <EditableField label="Content Tone"       clientId={id} section="section_i" field="content_tone"       value={str(i.content_tone)}       />
        <EditableField label="Restrictions"       clientId={id} section="section_i" field="content_restrictions" value={str(i.content_restrictions)} inputType="textarea" />
        {Object.keys(i).filter(k => !knownI.includes(k)).map(k => (
          <EditableField key={k} label={humanize(k)} clientId={id} section="section_i" field={k} value={str(i[k])} />
        ))}
      </SectionCard>

      <SectionCard title="Legal & Compliance (Section J)" accentColor="#f87171">
        <EditableField label="Regulated Industry"  clientId={id} section="section_j" field="regulated_industry"  value={str(j.regulated_industry)}  />
        <EditableField label="Disallowed Topics"   clientId={id} section="section_j" field="disallowed_topics"   value={str(j.disallowed_topics)}   inputType="textarea" />
        <EditableField label="Disclaimer Status"   clientId={id} section="section_j" field="disclaimer_status"   value={str(j.disclaimer_status)}   />
        <EditableField label="NDA Status"          clientId={id} section="section_j" field="nda_status"          value={str(j.nda_status)}          />
        <EditableField label="Compliance Notes"    clientId={id} section="section_j" field="compliance_notes"    value={str(j.compliance_notes)}    inputType="textarea" />
        {Object.keys(j).filter(k => !knownJ.includes(k)).map(k => (
          <EditableField key={k} label={humanize(k)} clientId={id} section="section_j" field={k} value={str(j[k])} />
        ))}
      </SectionCard>

      {client.section_k && Object.keys(client.section_k).length > 0 && (
        <SectionCard title="Agreement (Section K)" accentColor="#38bdf8">
          {Object.entries(client.section_k).map(([k, v]) => <InfoRow key={k} label={humanize(k)} value={v} />)}
        </SectionCard>
      )}
    </div>
  )
}

// ─── Tab 7: Internal Notes ────────────────────────────────────────────────────

function NotesTab({ client }: { client: ClientRow }) {
  const [notes, setNotes] = useState(client.section_notes ?? "")
  const { update, saving, saved, error } = useClientUpdate(client.id, "section_notes")

  useEffect(() => setNotes(client.section_notes ?? ""), [client.section_notes])

  return (
    <div className="space-y-4">
      <div className="bg-[#001f1f] border border-[#003434] rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Internal Notes (team-only)
          </label>
          <SaveIndicator saving={saving} saved={saved} error={error} />
        </div>
        <textarea
          value={notes}
          rows={10}
          onChange={e => {
            setNotes(e.target.value)
            update({ notes: e.target.value })
          }}
          className="w-full bg-[#001a1a] border border-[#003434] focus:border-[#70BF4B]/40 text-zinc-200 text-sm rounded-xl px-4 py-3 outline-none transition-colors resize-none"
          placeholder="Team-only notes, call logs, risk observations…"
        />
        <p className="text-zinc-700 text-xs mt-2">Auto-saves 500ms after you stop typing.</p>
      </div>
      {!!client.section_m?.risk_notes && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400 mb-1">Risk Notes</p>
          <p className="text-zinc-300 text-sm">{String(client.section_m?.risk_notes)}</p>
        </div>
      )}
    </div>
  )
}

// ─── Tab 8: Credentials ───────────────────────────────────────────────────────

function CredentialsTab({ client }: { client: ClientRow }) {
  const l  = client.section_l ?? {}
  const id = client.id

  const CRED_KEYS = [
    "google_analytics_id","google_search_console","facebook_pixel","gtm_container",
    "meta_business_id","instagram_login","facebook_login","twitter_login","linkedin_login",
    "tiktok_login","youtube_login","website_login","cpanel_login","hosting_provider",
    "domain_registrar","email_platform","crm_login","ads_account_id",
  ]

  const knownPresent = CRED_KEYS.filter(k => l[k] != null)
  const extraKeys    = Object.keys(l).filter(k => !CRED_KEYS.includes(k))

  const [newKey, setNewKey] = useState("")
  const [newVal, setNewVal] = useState("")
  const { update: addCred, saving: addSaving } = useClientUpdate(id, "section_l")

  function handleAdd() {
    const key = newKey.trim().toLowerCase().replace(/\s+/g, "_")
    if (!key) return
    addCred({ ...l, [key]: newVal.trim() })
    setNewKey("")
    setNewVal("")
  }

  const allKeys = Array.from(new Set([...knownPresent, ...extraKeys, ...CRED_KEYS.slice(0, 6)]))

  return (
    <div className="space-y-4">
      <SectionCard title="Platform Credentials & Access" accentColor="#f59e0b">
        <div className="py-2 mb-1">
          <p className="text-[10px] text-yellow-500/70 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
            Sensitive credentials are stored encrypted. Do not share this page link externally.
          </p>
        </div>
        {allKeys.map(k => (
          <EditableField key={k} label={humanize(k)} clientId={id} section="section_l" field={k} value={str(l[k])} />
        ))}
      </SectionCard>

      <div className="bg-[#001f1f] border border-[#003434] rounded-xl p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">Add Credential</p>
        <div className="flex gap-2 flex-wrap">
          <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Field name (e.g. shopify_login)" className="flex-1 min-w-36 bg-[#003434] text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#70BF4B]/40" />
          <input value={newVal} onChange={e => setNewVal(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} placeholder="Value" className="flex-2 min-w-48 bg-[#003434] text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#70BF4B]/40" />
          <button onClick={handleAdd} disabled={!newKey.trim() || addSaving} className="px-4 py-2 bg-[#70BF4B] hover:bg-[#5faa3e] disabled:opacity-40 text-[#001a1a] font-semibold text-sm rounded-xl transition-colors">
            {addSaving ? "Saving…" : "+ Add"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab 9: Package & Revenue ─────────────────────────────────────────────────

const PACKAGES = ["Starter","Growth","Premium","Enterprise","Custom"]
const PAYMENT_STATUSES = ["Paid","Pending","Overdue","On Hold"]
const RISK_PROFILES = ["Low","Medium","High"]

function PackageTab({ client }: { client: ClientRow }) {
  const m  = client.section_m ?? {}
  const id = client.id

  const knownM = [
    "package","tier","monthly_value","payment_status","contract_start","renewal_date",
    "contract_duration_months","risk_profile","risk_notes","assigned_am","status_override",
    "onboarding_fee","setup_fee",
  ]
  const extraM = Object.keys(m).filter(k => !knownM.includes(k))

  const renewalDate = useMemo(() => {
    const cs = str(m.contract_start)
    if (!cs) return ""
    return computeRenewalDate(cs, Number(m.contract_duration_months ?? 12))
  }, [m.contract_start, m.contract_duration_months])

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <SectionCard title="Service Package" accentColor="#D0F255">
        <EditableField
          label="Package" clientId={id} section="section_m" field="package"
          value={str(m.package)} inputType="select" options={PACKAGES}
        />
        <EditableField label="Tier"          clientId={id} section="section_m" field="tier"          value={str(m.tier)}          />
        <EditableField label="MRR (₹)"       clientId={id} section="section_m" field="monthly_value" value={str(m.monthly_value)} inputType="number" />
        <EditableField label="Onboarding Fee" clientId={id} section="section_m" field="onboarding_fee" value={str(m.onboarding_fee)} inputType="number" />
        <EditableField label="Setup Fee"     clientId={id} section="section_m" field="setup_fee"     value={str(m.setup_fee)}     inputType="number" />
        <EditableField
          label="Payment Status" clientId={id} section="section_m" field="payment_status"
          value={str(m.payment_status)} inputType="select" options={PAYMENT_STATUSES}
        />
        <EditableField label="Assigned AM"   clientId={id} section="section_m" field="assigned_am"   value={str(m.assigned_am)}   />
      </SectionCard>

      <SectionCard title="Contract Dates" accentColor="#38bdf8">
        <EditableField
          label="Contract Start"
          clientId={id}
          section="section_m"
          field="contract_start"
          value={str(m.contract_start)}
          inputType="date"
          computeSaveData={v => ({
            contract_start: v,
            ...(v ? { renewal_date: computeRenewalDate(v, Number(m.contract_duration_months ?? 12)) } : {}),
          })}
        />
        <EditableField label="Duration (mo)"  clientId={id} section="section_m" field="contract_duration_months" value={str(m.contract_duration_months ?? 12)} inputType="number" />
        <div className="flex flex-col sm:flex-row gap-1.5 py-3 border-b border-[#003434] last:border-0">
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:w-36 shrink-0 pt-0.5">
            Renewal Date
          </dt>
          <dd className="text-zinc-200 text-sm flex items-center gap-2">
            {str(m.renewal_date) || renewalDate || "—"}
            {renewalDate && !m.renewal_date && (
              <span className="text-[10px] text-zinc-600">(auto-computed)</span>
            )}
          </dd>
        </div>
        <EditableField label="Renewal Date (override)" clientId={id} section="section_m" field="renewal_date" value={str(m.renewal_date)} inputType="date" />
      </SectionCard>

      <SectionCard title="Risk & Status" accentColor="#f87171">
        <EditableField
          label="Risk Profile"  clientId={id} section="section_m" field="risk_profile"
          value={str(m.risk_profile)} inputType="select" options={RISK_PROFILES}
        />
        <EditableField label="Risk Notes"     clientId={id} section="section_m" field="risk_notes"     value={str(m.risk_notes)}     inputType="textarea" />
        <EditableField label="Status Override" clientId={id} section="section_m" field="status_override" value={str(m.status_override)} />
      </SectionCard>

      {extraM.length > 0 && (
        <SectionCard title="Additional Fields">
          {extraM.map(k => (
            <EditableField key={k} label={humanize(k)} clientId={id} section="section_m" field={k} value={str(m[k])} />
          ))}
        </SectionCard>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

const TABS = [
  "Overview", "Brand Kit", "Social Accounts", "Onboarding",
  "Content Calendar", "Legal", "Notes", "Credentials", "Package",
]

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState(0)
  const { data, isLoading, error } = useSWR<ApiResponse>(`/api/clients/${params.id}`, fetcher)

  if (isLoading) {
    return (
      <div className="space-y-6 pb-20 lg:pb-4">
        <Skeleton className="h-4 w-20" />
        <div className="bg-[#001f1f] border border-[#003434] rounded-2xl p-6">
          <div className="flex gap-4">
            <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-3 w-32" /></div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">{TABS.map(t => <Skeleton key={t} className="h-8 w-24 rounded-xl" />)}</div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (error || data?.error || !data?.client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
        <p className="text-white font-semibold">Client not found</p>
        <p className="text-zinc-500 text-sm">{data?.error ?? "No client matches this ID."}</p>
        <Link href="/clients" className="text-[#70BF4B] border border-[#70BF4B]/30 px-4 py-2 rounded-xl text-sm hover:border-[#70BF4B]/60 transition-colors">
          ← Back to Clients
        </Link>
      </div>
    )
  }

  const { client, contentCalendar } = data
  const displayName = client.legal_name || client.email || "Unknown Client"
  const m           = client.section_m ?? {}

  function handleExport() {
    const sheets = buildExportSheets(client)
    const slug   = (client.legal_name ?? client.email ?? client.id).replace(/\s+/g, "_")
    exportToXLSX(sheets, `emozi_client_${slug}_${todayStr()}.xlsx`)
  }

  return (
    <div className="space-y-5 pb-20 lg:pb-4 max-w-6xl">
      {/* Back */}
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Clients
      </Link>

      {/* Hero */}
      <div className="bg-[#001f1f] border border-[#003434] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#003434] to-[#70BF4B] flex items-center justify-center shrink-0 shadow-lg shadow-[#70BF4B]/10">
            <span className="text-[#D0F255] font-bold text-xl">{displayName[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-xl font-bold tracking-tight truncate">{displayName}</h1>
            <p className="text-zinc-500 text-sm mt-0.5">{client.email}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Badge label={client.status ?? ""} colorMap={STATUS_COLOR} />
            {!!m.risk_profile && <Badge label={str(m.risk_profile)} colorMap={RISK_COLOR} />}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border border-[#003434] bg-[#001a1a] text-zinc-400 hover:text-white hover:border-[#70BF4B]/40 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export XLSX
            </button>
          </div>
        </div>
        {m.monthly_value != null && (
          <p className="text-[#D0F255] font-mono text-sm mt-4">
            ₹{Number(m.monthly_value).toLocaleString("en-IN")}/mo · {str(m.package) || "No package"}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === i
                ? "bg-[#003434] text-[#D0F255] border border-[#70BF4B]/30"
                : "text-zinc-500 hover:text-zinc-200 hover:bg-[#001f1f] border border-transparent"
            }`}
          >
            {tab}
          </button>
        ))}
        <Link
          href={`/clients/${params.id}/checklist`}
          className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all text-zinc-500 hover:text-zinc-200 hover:bg-[#001f1f] border border-transparent flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Checklist
        </Link>
      </div>

      {/* Tab content */}
      {activeTab === 0 && <OverviewTab       client={client} />}
      {activeTab === 1 && <BrandKitTab       client={client} />}
      {activeTab === 2 && <SocialTab         client={client} />}
      {activeTab === 3 && <OnboardingTab     client={client} />}
      {activeTab === 4 && <CalendarTab       entries={contentCalendar} />}
      {activeTab === 5 && <LegalTab          client={client} />}
      {activeTab === 6 && <NotesTab          client={client} />}
      {activeTab === 7 && <CredentialsTab    client={client} />}
      {activeTab === 8 && <PackageTab        client={client} />}
    </div>
  )
}
