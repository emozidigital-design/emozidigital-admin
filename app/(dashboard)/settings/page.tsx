"use client"

import { useState, type FormEvent } from "react"
import { useSession, signOut } from "next-auth/react"

function SectionCard({ title, accentColor = "#70BF4B", children }: {
  title: string; accentColor?: string; children: React.ReactNode
}) {
  return (
    <div className="bg-[#001f1f] border border-[#003434] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[#003434] flex items-center gap-2">
        <div className="w-1 h-4 rounded-full" style={{ background: accentColor }} />
        <h3 className="text-white text-sm font-semibold">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 py-3 border-b border-[#003434] last:border-0">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:w-40 shrink-0 pt-0.5">{label}</dt>
      <dd className="text-zinc-200 text-sm">{value}</dd>
    </div>
  )
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [saved, setSaved] = useState(false)
  const [brandName,  setBrandName]  = useState("Emozi Digital")
  const [timezone,   setTimezone]   = useState("Asia/Kolkata")
  const [currency,   setCurrency]   = useState("INR")
  const [remindDays, setRemindDays] = useState("2")

  function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const TIMEZONES = [
    "Asia/Kolkata", "Asia/Dubai", "Europe/London",
    "America/New_York", "America/Los_Angeles", "UTC",
  ]
  const CURRENCIES = ["INR", "USD", "AED", "GBP", "EUR"]

  return (
    <div className="space-y-6 pb-20 lg:pb-4 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-white text-xl font-bold tracking-tight">Settings</h1>
        <p className="text-zinc-600 text-sm mt-0.5">Admin panel configuration</p>
      </div>

      {/* Account */}
      <SectionCard title="Account" accentColor="#38bdf8">
        <dl>
          <Row label="Email"   value={session?.user?.email ?? "—"} />
          <Row label="Role"    value={<span className="text-[#70BF4B]">Administrator</span>} />
          <Row label="Session" value={session ? "Active" : "None"} />
        </dl>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-4 flex items-center gap-2 text-sm text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 px-4 py-2 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </SectionCard>

      {/* General preferences */}
      <SectionCard title="General Preferences">
        <form onSubmit={handleSave} className="space-y-4">
          {[
            {
              label: "Brand name",
              id: "brandName",
              type: "text" as const,
              value: brandName,
              set: setBrandName,
              hint: "Shown in emails and reports",
            },
          ].map(f => (
            <div key={f.id}>
              <label htmlFor={f.id} className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">
                {f.label}
              </label>
              <input
                id={f.id}
                type={f.type}
                value={f.value}
                onChange={e => f.set(e.target.value)}
                className="w-full bg-[#003434] border border-[#70BF4B]/20 focus:border-[#70BF4B]/50 text-white text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
              />
              {f.hint && <p className="text-zinc-600 text-xs mt-1">{f.hint}</p>}
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Timezone</label>
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="w-full bg-[#003434] border border-[#70BF4B]/20 text-white text-sm rounded-lg px-3 py-2.5 outline-none"
              >
                {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-[#003434] border border-[#70BF4B]/20 text-white text-sm rounded-lg px-3 py-2.5 outline-none"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">
              Onboarding reminder — send after (days)
            </label>
            <input
              type="number"
              min={1}
              max={14}
              value={remindDays}
              onChange={e => setRemindDays(e.target.value)}
              className="w-full bg-[#003434] border border-[#70BF4B]/20 focus:border-[#70BF4B]/50 text-white text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
            />
            <p className="text-zinc-600 text-xs mt-1">Days of inactivity before an automatic reminder email is triggered</p>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#70BF4B] hover:bg-[#5faa3e] text-[#001a1a] font-semibold text-sm rounded-xl transition-colors"
          >
            {saved ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </>
            ) : "Save preferences"}
          </button>
        </form>
      </SectionCard>

      {/* Integrations */}
      <SectionCard title="Integrations" accentColor="#a78bfa">
        <div className="space-y-3">
          {[
            { name: "Supabase",  desc: "Database & auth",       status: "connected", color: "#34d399" },
            { name: "Brevo",     desc: "Transactional email",   status: "connected", color: "#34d399" },
            { name: "n8n",       desc: "Workflow automation",   status: "connected", color: "#34d399" },
            { name: "HubSpot",   desc: "CRM",                   status: "manual",    color: "#fbbf24" },
            { name: "Google",    desc: "Analytics & Search Console", status: "manual", color: "#fbbf24" },
          ].map(i => (
            <div key={i.name} className="flex items-center justify-between py-2 border-b border-[#003434] last:border-0">
              <div>
                <p className="text-zinc-200 text-sm font-medium">{i.name}</p>
                <p className="text-zinc-600 text-xs">{i.desc}</p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full border" style={{
                background: `${i.color}15`,
                color: i.color,
                borderColor: `${i.color}30`,
              }}>
                {i.status}
              </span>
            </div>
          ))}
        </div>
        <p className="text-zinc-600 text-xs mt-4">API keys are managed via environment variables (.env.local). Restart the server after changes.</p>
      </SectionCard>

      {/* Danger zone */}
      <SectionCard title="System" accentColor="#f87171">
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-[#003434]">
            <div>
              <p className="text-zinc-200 text-sm font-medium">Clear SWR cache</p>
              <p className="text-zinc-600 text-xs">Force refresh all data on next page load</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-medium px-3 py-1.5 border border-[#003434] text-zinc-400 hover:text-white rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-zinc-200 text-sm font-medium">Version</p>
              <p className="text-zinc-600 text-xs">Emozi Admin Panel</p>
            </div>
            <span className="text-zinc-600 text-xs font-mono">v1.0.0</span>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
