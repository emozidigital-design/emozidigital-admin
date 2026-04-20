import { supabase } from "@/lib/supabase"
import Link from "next/link"

export const dynamic = "force-dynamic"

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionA = {
  legal_name?: string
  industry?: string
  city?: string
  website?: string
  team_size?: string | number
  [key: string]: unknown
}

type SectionB = {
  email?: string
  phone?: string
  [key: string]: unknown
}

type Client = {
  id: string
  email: string | null
  legal_name: string | null
  status: string | null
  current_step: number | null
  section_a: SectionA | null
  section_b: SectionB | null
  section_c: Record<string, unknown> | null
  section_d: Record<string, unknown> | null
  section_e: Record<string, unknown> | null
  section_f: Record<string, unknown> | null
  section_g: Record<string, unknown> | null
  section_h: Record<string, unknown> | null
  section_i: Record<string, unknown> | null
  section_j: Record<string, unknown> | null
  section_k: Record<string, unknown> | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—"
  if (typeof val === "boolean") return val ? "Yes" : "No"
  if (Array.isArray(val)) return val.join(", ")
  if (typeof val === "object") return JSON.stringify(val, null, 2)
  return String(val)
}

function humanize(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  inactive: "bg-zinc-700/40 text-zinc-400 border-zinc-600/30",
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: unknown }) {
  const display = formatValue(value)
  if (display === "—" && !value) return null
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2.5 border-b border-zinc-800/60 last:border-0">
      <dt className="text-zinc-500 text-xs font-medium uppercase tracking-wide shrink-0 sm:w-32">{label}</dt>
      <dd className="text-zinc-200 text-sm break-words">{display}</dd>
    </div>
  )
}

function SectionCard({
  title,
  children,
  accent = "purple",
}: {
  title: string
  children: React.ReactNode
  accent?: string
}) {
  const accents: Record<string, string> = {
    purple: "from-purple-600 to-violet-500",
    blue: "from-blue-600 to-cyan-500",
    rose: "from-rose-600 to-pink-500",
    amber: "from-amber-600 to-yellow-500",
    teal: "from-teal-600 to-emerald-500",
    indigo: "from-indigo-600 to-blue-500",
    sky: "from-sky-600 to-cyan-500",
    green: "from-green-600 to-teal-500",
    orange: "from-orange-600 to-amber-500",
  }
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3">
        <div className={`w-2 h-5 rounded-full bg-gradient-to-b ${accents[accent] ?? accents["purple"]}`} />
        <h3 className="text-white font-semibold text-sm">{title}</h3>
      </div>
      <dl className="px-5 py-1">{children}</dl>
    </div>
  )
}

function GenericSection({
  label,
  data,
  accent,
}: {
  label: string
  data: Record<string, unknown> | null
  accent?: string
}) {
  if (!data) {
    return (
      <SectionCard title={label} accent={accent}>
        <p className="text-zinc-500 text-sm py-4">No data submitted yet.</p>
      </SectionCard>
    )
  }
  const entries = Object.entries(data).filter(([k]) => k !== "id")
  if (!entries.length) {
    return (
      <SectionCard title={label} accent={accent}>
        <p className="text-zinc-500 text-sm py-4">No data submitted yet.</p>
      </SectionCard>
    )
  }
  return (
    <SectionCard title={label} accent={accent}>
      {entries.map(([k, v]) => (
        <InfoRow key={k} label={humanize(k)} value={v} />
      ))}
    </SectionCard>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, email, legal_name, status, current_step, section_a, section_b, section_c, section_d, section_e, section_f, section_g, section_h, section_i, section_j, section_k"
    )
    .eq("id", params.id)
    .single<Client>()

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-white font-semibold text-lg mb-1">Client not found</h2>
        <p className="text-zinc-500 text-sm mb-6">
          {error ? error.message : "No client matches this ID."}
        </p>
        <Link
          href="/dashboard/clients"
          className="text-sm text-purple-400 hover:text-purple-300 border border-purple-600/40 hover:border-purple-500/60 px-4 py-2 rounded-lg transition-colors"
        >
          ← Back to Clients
        </Link>
      </div>
    )
  }

  const total = 11
  const current = data.current_step ?? 0
  const pct = Math.round((current / total) * 100)
  const statusCls =
    STATUS_STYLES[(data.status ?? "pending").toLowerCase()] ?? STATUS_STYLES["pending"]

  const genericSections: {
    key: keyof Client
    label: string
    accent: string
  }[] = [
    { key: "section_c", label: "Section C", accent: "rose" },
    { key: "section_d", label: "Section D", accent: "amber" },
    { key: "section_e", label: "Section E", accent: "teal" },
    { key: "section_f", label: "Section F", accent: "indigo" },
    { key: "section_g", label: "Section G", accent: "sky" },
    { key: "section_h", label: "Section H", accent: "green" },
    { key: "section_i", label: "Section I", accent: "orange" },
    { key: "section_j", label: "Section J", accent: "blue" },
    { key: "section_k", label: "Section K", accent: "purple" },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 lg:pb-6">

      {/* Back link */}
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Clients
      </Link>

      {/* Hero banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-violet-500 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xl">
              {(data.legal_name ?? data.email ?? "?")[0]?.toUpperCase()}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-xl font-bold truncate">
              {data.legal_name ?? data.email ?? "Unknown Client"}
            </h1>
            <p className="text-zinc-400 text-sm mt-0.5">{data.email ?? "—"}</p>
          </div>

          {/* Status */}
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border shrink-0 ${statusCls}`}
          >
            {data.status ?? "pending"}
          </span>
        </div>

        {/* Progress */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-500 text-xs">Onboarding progress</span>
            <span className="text-zinc-300 text-xs font-semibold">
              Step {current} of {total} — {pct}%
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-600 to-violet-500 h-2 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Section A — Business Info */}
      <SectionCard title="Section A — Business Info" accent="purple">
        <InfoRow label="Legal Name" value={data.section_a?.legal_name} />
        <InfoRow label="Industry" value={data.section_a?.industry} />
        <InfoRow label="City" value={data.section_a?.city} />
        <InfoRow label="Website" value={data.section_a?.website} />
        <InfoRow label="Team Size" value={data.section_a?.team_size} />
        {data.section_a &&
          Object.entries(data.section_a)
            .filter(([k]) => !["legal_name", "industry", "city", "website", "team_size"].includes(k))
            .map(([k, v]) => <InfoRow key={k} label={humanize(k)} value={v} />)}
        {!data.section_a && (
          <p className="text-zinc-500 text-sm py-4">No data submitted yet.</p>
        )}
      </SectionCard>

      {/* Section B — Contact */}
      <SectionCard title="Section B — Contact" accent="blue">
        <InfoRow label="Email" value={data.section_b?.email} />
        <InfoRow label="Phone" value={data.section_b?.phone} />
        {data.section_b &&
          Object.entries(data.section_b)
            .filter(([k]) => !["email", "phone"].includes(k))
            .map(([k, v]) => <InfoRow key={k} label={humanize(k)} value={v} />)}
        {!data.section_b && (
          <p className="text-zinc-500 text-sm py-4">No data submitted yet.</p>
        )}
      </SectionCard>

      {/* Sections C–K */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {genericSections.map(({ key, label, accent }) => (
          <GenericSection
            key={key}
            label={label}
            data={data[key] as Record<string, unknown> | null}
            accent={accent}
          />
        ))}
      </div>
    </div>
  )
}
