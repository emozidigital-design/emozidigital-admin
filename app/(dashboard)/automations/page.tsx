"use client"

const AUTOMATIONS = [
  {
    id: "a1",
    name: "New Lead → CRM + WhatsApp",
    description: "When a new lead submits the contact form, create a HubSpot contact and send a WhatsApp welcome message via n8n.",
    trigger: "Form submission",
    action: "HubSpot + WhatsApp",
    status: "active",
    runs: 142,
    lastRun: "2025-04-20",
    platform: "n8n",
  },
  {
    id: "a2",
    name: "Onboarding Reminder Email",
    description: "Send a reminder email via Brevo if a client has not completed their onboarding form within 48 hours.",
    trigger: "48h inactivity",
    action: "Brevo email",
    status: "active",
    runs: 38,
    lastRun: "2025-04-19",
    platform: "Brevo",
  },
  {
    id: "a3",
    name: "Monthly Report Generation",
    description: "Pull GA4 + Meta data and compile a report PDF at the start of each month for each active client.",
    trigger: "1st of month",
    action: "Report PDF",
    status: "paused",
    runs: 12,
    lastRun: "2025-04-01",
    platform: "n8n",
  },
  {
    id: "a4",
    name: "Overdue Payment Alert",
    description: "Alert the AM via Slack when a client payment status is Overdue for more than 7 days.",
    trigger: "Payment overdue 7d",
    action: "Slack alert",
    status: "active",
    runs: 5,
    lastRun: "2025-04-15",
    platform: "n8n",
  },
  {
    id: "a5",
    name: "Content Approval Request",
    description: "Automatically send a content approval link to the client when posts are moved to 'review' status.",
    trigger: "Status → review",
    action: "Email + WhatsApp",
    status: "draft",
    runs: 0,
    lastRun: null,
    platform: "n8n",
  },
  {
    id: "a6",
    name: "Client Onboarding Complete",
    description: "When all 13 onboarding sections are filled, update CRM status to Active and notify the AM.",
    trigger: "All sections filled",
    action: "CRM update + Slack",
    status: "draft",
    runs: 0,
    lastRun: null,
    platform: "n8n",
  },
]

const STATUS_STYLE: Record<string, string> = {
  active: "bg-[#70BF4B]/15 text-[#70BF4B] border-[#70BF4B]/30",
  paused: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  draft:  "bg-zinc-700/30 text-zinc-400 border-zinc-600/30",
}
const PLATFORM_STYLE: Record<string, string> = {
  "n8n": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "Brevo":    "bg-blue-500/15 text-blue-400 border-blue-500/30",
}

export default function AutomationsPage() {
  const active = AUTOMATIONS.filter(a => a.status === "active").length
  const total  = AUTOMATIONS.length
  const totalRuns = AUTOMATIONS.reduce((s, a) => s + a.runs, 0)

  return (
    <div className="space-y-6 pb-20 lg:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold tracking-tight">Automations</h1>
          <p className="text-zinc-600 text-sm mt-0.5">{active} of {total} active · {totalRuns} total runs</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active",     value: active,    color: "#70BF4B" },
          { label: "Total runs", value: totalRuns, color: "#D0F255" },
          { label: "Platforms",  value: 2,          color: "#a78bfa" },
        ].map(s => (
          <div key={s.label} className="bg-[#001f1f] border border-[#003434] rounded-xl p-4">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Automation cards */}
      <div className="space-y-3">
        {AUTOMATIONS.map(automation => (
          <div
            key={automation.id}
            className="bg-[#001f1f] border border-[#003434] rounded-xl p-4 hover:border-[#003434]/80 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* Status dot */}
              <div className="mt-1 shrink-0">
                <div className={`w-2 h-2 rounded-full ${
                  automation.status === "active" ? "bg-[#70BF4B] shadow-sm shadow-[#70BF4B]/50" :
                  automation.status === "paused" ? "bg-yellow-400" : "bg-zinc-600"
                }`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-white text-sm font-semibold">{automation.name}</p>
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

                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Trigger</span>
                    <span className="text-[11px] text-zinc-400 bg-[#003434]/60 px-2 py-0.5 rounded-md">{automation.trigger}</span>
                  </div>
                  <span className="text-zinc-700">→</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Action</span>
                    <span className="text-[11px] text-zinc-400 bg-[#003434]/60 px-2 py-0.5 rounded-md">{automation.action}</span>
                  </div>
                  <div className="ml-auto flex items-center gap-3 text-xs text-zinc-600">
                    <span>{automation.runs} runs</span>
                    {automation.lastRun && <span>Last: {automation.lastRun}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div className="bg-[#003434]/30 border border-[#70BF4B]/15 rounded-xl p-4 flex gap-3">
        <svg className="w-5 h-5 text-[#70BF4B] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-zinc-300 text-sm font-medium">Automations are managed in n8n and Brevo</p>
          <p className="text-zinc-500 text-xs mt-0.5">This view shows automation statuses. To edit triggers and actions, log in to your n8n or Brevo dashboard directly.</p>
        </div>
      </div>
    </div>
  )
}
