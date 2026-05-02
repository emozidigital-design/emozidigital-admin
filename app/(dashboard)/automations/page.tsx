"use client"

import { useState } from "react"
import useSWR from "swr"
import { toast } from "react-hot-toast"

// ─── Types ────────────────────────────────────────────────────────────────────

type RunResult = {
  ok: boolean
  execution_id?: string
  webhook_url?: string
  error?: string
  test_mode?: boolean
}

type RunHistoryDot = { status: "success" | "fail" | "idle"; label: string }

type Automation = {
  id: string
  name: string
  description: string
  trigger: string
  action: string
  status: "active" | "paused" | "error"
  platform: string
  clientSpecific: boolean
  n8nWorkflowId: string | null   // null = Brevo / non-n8n
  webhookPath: string | null
  fakeRuns: RunHistoryDot[]
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ─── Automation definitions ───────────────────────────────────────────────────

const N8N_EDITOR_BASE = "https://emozi-n8n.onrender.com/workflow"

const AUTOMATIONS: Automation[] = [
  {
    id: "a1",
    name: "New Lead → CRM + WhatsApp",
    description: "When a new lead submits the contact form, create a HubSpot contact and send a WhatsApp welcome message.",
    trigger: "Form submission",
    action: "HubSpot + WhatsApp",
    status: "active",
    platform: "n8n",
    clientSpecific: false,
    n8nWorkflowId: "1",
    webhookPath: "new-lead",
    fakeRuns: [
      { status: "success", label: "Apr 20" },
      { status: "success", label: "Apr 18" },
      { status: "success", label: "Apr 15" },
      { status: "fail",    label: "Apr 12" },
      { status: "success", label: "Apr 10" },
    ],
  },
  {
    id: "a2",
    name: "Onboarding Reminder Email",
    description: "Send a reminder email via Brevo if a client has not completed onboarding within 48 hours.",
    trigger: "48h inactivity",
    action: "Brevo email",
    status: "active",
    platform: "Brevo",
    clientSpecific: true,
    n8nWorkflowId: null,
    webhookPath: "onboarding-reminder",
    fakeRuns: [
      { status: "success", label: "Apr 19" },
      { status: "success", label: "Apr 16" },
      { status: "success", label: "Apr 14" },
      { status: "success", label: "Apr 11" },
      { status: "idle",    label: "—" },
    ],
  },
  {
    id: "a3",
    name: "Monthly Report Generation",
    description: "Pull GA4 + Meta data and compile a report PDF at the start of each month per active client.",
    trigger: "1st of month",
    action: "Report PDF",
    status: "paused",
    platform: "n8n",
    clientSpecific: true,
    n8nWorkflowId: "2",
    webhookPath: "monthly-report",
    fakeRuns: [
      { status: "success", label: "Apr 01" },
      { status: "success", label: "Mar 01" },
      { status: "fail",    label: "Feb 01" },
      { status: "success", label: "Jan 01" },
      { status: "success", label: "Dec 01" },
    ],
  },
  {
    id: "a4",
    name: "Overdue Payment Alert",
    description: "Alert the AM via Slack when a client payment status is Overdue for more than 7 days.",
    trigger: "Payment overdue 7d",
    action: "Slack alert",
    status: "active",
    platform: "n8n",
    clientSpecific: true,
    n8nWorkflowId: "3",
    webhookPath: "overdue-payment",
    fakeRuns: [
      { status: "success", label: "Apr 15" },
      { status: "success", label: "Apr 08" },
      { status: "idle",    label: "—" },
      { status: "idle",    label: "—" },
      { status: "idle",    label: "—" },
    ],
  },
  {
    id: "a5",
    name: "Content Approval Request",
    description: "Automatically send a content approval link to the client when posts move to 'review' status.",
    trigger: "Status → review",
    action: "Email + WhatsApp",
    status: "active",
    platform: "n8n",
    clientSpecific: true,
    n8nWorkflowId: "4",
    webhookPath: "content-approval",
    fakeRuns: [
      { status: "idle", label: "—" },
      { status: "idle", label: "—" },
      { status: "idle", label: "—" },
      { status: "idle", label: "—" },
      { status: "idle", label: "—" },
    ],
  },
  {
    id: "a6",
    name: "Client Onboarding Complete",
    description: "When all 13 onboarding sections are filled, update CRM status to Active and notify the AM.",
    trigger: "All sections filled",
    action: "CRM update + Slack",
    status: "active",
    platform: "n8n",
    clientSpecific: true,
    n8nWorkflowId: "5",
    webhookPath: "onboarding-complete",
    fakeRuns: [
      { status: "idle", label: "—" },
      { status: "idle", label: "—" },
      { status: "idle", label: "—" },
      { status: "idle", label: "—" },
      { status: "idle", label: "—" },
    ],
  },
]

// ─── Status styles ────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  active: "bg-[#70BF4B]/15 text-[#70BF4B] border-[#70BF4B]/30",
  paused: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  error:  "bg-red-500/15 text-red-400 border-red-500/30",
}
const STATUS_DOT: Record<string, string> = {
  active: "bg-[#70BF4B] shadow-sm shadow-[#70BF4B]/60",
  paused: "bg-yellow-400",
  error:  "bg-red-400 animate-pulse",
}
const PLATFORM_STYLE: Record<string, string> = {
  "n8n":   "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "Brevo": "bg-blue-500/15 text-blue-400 border-blue-500/30",
}

// ─── Run history dots ─────────────────────────────────────────────────────────

function RunDots({ runs }: { runs: RunHistoryDot[] }) {
  return (
    <div className="flex items-center gap-1">
      {runs.map((r, i) => (
        <div
          key={i}
          title={`${r.label}: ${r.status}`}
          className={`w-2 h-2 rounded-full transition-all ${
            r.status === "success" ? "bg-[#70BF4B]" :
            r.status === "fail"    ? "bg-red-400" :
                                     "bg-zinc-200"
          }`}
        />
      ))}
      <span className="text-[10px] text-zinc-600 ml-1 font-mono">last 5</span>
    </div>
  )
}

// ─── Automation card ──────────────────────────────────────────────────────────

function AutomationCard({
  automation, clients,
}: {
  automation: Automation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clients: any[]
}) {
  const [expanded, setExpanded] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState("")
  const [running, setRunning] = useState(false)
  const [testing, setTesting] = useState(false)
  const [lastResult, setLastResult] = useState<RunResult | null>(null)

  async function trigger(testMode: boolean) {
    if (testMode) setTesting(true)
    else setRunning(true)
    setLastResult(null)

    try {
      const res = await fetch("/api/automations/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_id: automation.id,
          client_id: testMode ? "test" : (selectedClientId || undefined),
          test_mode: testMode,
        }),
      })
      const json = await res.json()
      const result: RunResult = {
        ok: res.ok,
        execution_id: json.execution_id,
        webhook_url: json.webhook_url,
        error: json.error,
        test_mode: testMode,
      }
      setLastResult(result)
      if (res.ok) {
        toast.success(testMode ? "Test run triggered!" : "Workflow triggered!")
      } else {
        toast.error(json.error ?? "Trigger failed")
      }
    } catch (e) {
      const err = String(e)
      setLastResult({ ok: false, error: err })
      toast.error("Network error")
    } finally {
      setRunning(false)
      setTesting(false)
    }
  }

  const isClientReady = !automation.clientSpecific || selectedClientId !== ""
  const n8nEditorUrl = automation.n8nWorkflowId
    ? `${N8N_EDITOR_BASE}/${automation.n8nWorkflowId}`
    : null

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-all shadow-sm ${
      expanded ? "border-[#70BF4B]/50" : "border-zinc-200"
    }`}>
      {/* Card header — always visible */}
      <div
        className="p-4 cursor-pointer hover:bg-zinc-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start gap-3">
          {/* Status dot */}
          <div className="mt-1 shrink-0">
            <div className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[automation.status]}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <p className="text-zinc-900 text-sm font-semibold">{automation.name}</p>
                <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">{automation.description}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLE[automation.status]}`}>
                  {automation.status}
                </span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${PLATFORM_STYLE[automation.platform] ?? "bg-zinc-700/30 text-zinc-400 border-zinc-600/30"}`}>
                  {automation.platform}
                </span>
              </div>
            </div>

            {/* Trigger → Action + run dots */}
            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              <span className="text-[11px] text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md">
                {automation.trigger}
              </span>
              <span className="text-zinc-400 text-xs">→</span>
              <span className="text-[11px] text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md">
                {automation.action}
              </span>
              <div className="ml-auto">
                <RunDots runs={automation.fakeRuns} />
              </div>
            </div>
          </div>

          {/* Expand chevron */}
          <svg
            className={`w-4 h-4 text-zinc-600 shrink-0 transition-transform mt-1 ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-zinc-100 px-4 pb-4 pt-3 space-y-3 bg-zinc-50/50">

          {/* Client selector (only for client-specific workflows) */}
          {automation.clientSpecific && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Select Client
              </label>
              <select
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
                className="w-full bg-white border border-zinc-200 text-zinc-700 text-sm rounded-xl px-3 py-2 outline-none focus:border-[#70BF4B] transition-colors"
              >
                <option value="">— Choose a client —</option>
                {clients.map((c: {id: string; name: string}) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Run Manually */}
            <button
              onClick={() => trigger(false)}
              disabled={running || testing || !isClientReady}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all shadow-sm ${
                running || testing || !isClientReady
                  ? "bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed"
                  : "bg-[#003434] border-[#003434] text-white hover:bg-[#004d4d]"
              }`}
            >
              {running ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Running…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Run Manually
                </>
              )}
            </button>

            {/* Test with Dummy Data */}
            <button
              onClick={() => trigger(true)}
              disabled={running || testing}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all shadow-sm ${
                running || testing
                  ? "bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed"
                  : "bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-400"
              }`}
            >
              {testing ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Testing…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                  </svg>
                  Test with Dummy Data
                </>
              )}
            </button>

            {/* View in n8n */}
            {n8nEditorUrl ? (
              <a
                href={n8nEditorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border border-zinc-200 bg-white text-zinc-500 hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View in n8n
              </a>
            ) : (
              <div className="flex items-center justify-center px-3 py-2.5 rounded-xl text-xs text-zinc-400 border border-zinc-100 bg-zinc-50/50 select-none">
                Not in n8n
              </div>
            )}
          </div>

          {/* Execution result */}
          {lastResult && (
            <div className={`rounded-xl px-4 py-3 border text-xs space-y-1.5 ${
              lastResult.ok
                ? "bg-[#70BF4B]/8 border-[#70BF4B]/25"
                : "bg-red-500/8 border-red-500/25"
            }`}>
              <div className="flex items-center gap-2">
                <span className={lastResult.ok ? "text-[#70BF4B]" : "text-red-400"}>
                  {lastResult.ok ? "✓" : "✕"}
                </span>
                <span className={`font-semibold ${lastResult.ok ? "text-[#70BF4B]" : "text-red-400"}`}>
                  {lastResult.ok
                    ? (lastResult.test_mode ? "Test run triggered successfully" : "Workflow triggered successfully")
                    : "Trigger failed"}
                </span>
                {lastResult.test_mode && (
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200">
                    test mode
                  </span>
                )}
              </div>
              {lastResult.execution_id && (
                <div className="flex items-center gap-2 text-zinc-500">
                  <span className="font-mono text-[10px]">ID: {lastResult.execution_id}</span>
                  {n8nEditorUrl && (
                    <a
                      href={`${N8N_EDITOR_BASE}/${automation.n8nWorkflowId}/executions`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 text-[10px] underline underline-offset-2"
                    >
                      View logs →
                    </a>
                  )}
                </div>
              )}
              {lastResult.error && (
                <p className="text-red-400 font-mono text-[10px] break-all">{lastResult.error}</p>
              )}
            </div>
          )}

          {/* Client-specific hint */}
          {automation.clientSpecific && !selectedClientId && !lastResult && (
            <p className="text-zinc-600 text-[11px] text-center italic">
              Select a client above to enable "Run Manually". "Test with Dummy Data" always works.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AutomationsPage() {
  const { data: clientsData } = useSWR("/api/clients", fetcher)
  const clients = clientsData?.clients ?? []

  const active    = AUTOMATIONS.filter(a => a.status === "active").length
  const total     = AUTOMATIONS.length
  const errorCount = AUTOMATIONS.filter(a => a.status === "error").length

  return (
    <div className="space-y-6 pb-20 lg:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-zinc-900 text-xl font-bold tracking-tight">Automations</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {active} active · {total - active} paused
            {errorCount > 0 && <span className="text-red-400 ml-1">· {errorCount} error</span>}
          </p>
        </div>
        <a
          href="https://emozi-n8n.onrender.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open n8n
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active",   value: active,       color: "#70BF4B" },
          { label: "Paused",   value: total - active - errorCount, color: "#f59e0b" },
          { label: "Platforms", value: 2,             color: "#a78bfa" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#70BF4B]" />Success</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" />Failed</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-zinc-200" />No run</span>
        <span className="ml-auto text-zinc-400 italic">Click a card to expand run controls</span>
      </div>

      {/* Automation cards */}
      <div className="space-y-3">
        {AUTOMATIONS.map(automation => (
          <AutomationCard
            key={automation.id}
            automation={automation}
            clients={clients}
          />
        ))}
      </div>

      {/* Info banner */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex gap-3">
        <svg className="w-5 h-5 text-[#003434] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-zinc-900 text-sm font-medium">Manual triggers run the real workflow</p>
          <p className="text-zinc-500 text-xs mt-0.5">
            Use <span className="text-zinc-900 font-medium">Test with Dummy Data</span> first to verify a workflow before running it against real clients.
          </p>
        </div>
      </div>
    </div>
  )
}
