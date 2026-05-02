"use client"

import { useRouter } from "next/navigation"

type Client = {
  id: string
  legal_name: string | null
  email: string | null
  status: string | null
  current_step: number | null
  created_at: string | null
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-600 border-emerald-100",
  inactive: "bg-zinc-100 text-zinc-600 border-zinc-200",
  pending: "bg-amber-50 text-amber-600 border-amber-100",
  completed: "bg-blue-50 text-blue-600 border-blue-100",
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status ?? "pending").toLowerCase()
  const cls = STATUS_STYLES[s] ?? STATUS_STYLES["pending"]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}
    >
      {status ?? "—"}
    </span>
  )
}

function StepBar({ step }: { step: number | null }) {
  const total = 11
  const current = step ?? 0
  const pct = Math.round((current / total) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 bg-zinc-100 rounded-full h-1.5">
        <div
          className="bg-[#70BF4B] h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-zinc-400 text-xs">{current}/{total}</span>
    </div>
  )
}

export default function ClientsTable({ clients }: { clients: Client[] }) {
  const router = useRouter()

  if (!clients.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-zinc-900 font-semibold mb-1">No clients yet</h3>
        <p className="text-zinc-500 text-sm">Once clients complete onboarding, they&apos;ll appear here.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-5 py-3.5">Name</th>
              <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-5 py-3.5">Email</th>
              <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-5 py-3.5">Status</th>
              <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-5 py-3.5">Step</th>
              <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-5 py-3.5">Created</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {clients.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                  className="hover:bg-zinc-50 cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-4">
                    <span className="text-zinc-900 font-medium text-sm">
                      {client.legal_name ?? <span className="text-zinc-400 italic">Unnamed</span>}
                    </span>
                  </td>
                <td className="px-5 py-4">
                  <span className="text-zinc-600 text-sm">{client.email ?? "—"}</span>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={client.status} />
                </td>
                <td className="px-5 py-4">
                  <StepBar step={client.current_step} />
                </td>
                <td className="px-5 py-4">
                  <span className="text-zinc-400 text-sm">
                    {client.created_at
                      ? new Date(client.created_at).toLocaleDateString()
                      : "—"}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <svg className="w-4 h-4 text-zinc-300 group-hover:text-[#003434] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-zinc-800">
        {clients.map((client) => (
          <div
            key={client.id}
            onClick={() => router.push(`/dashboard/clients/${client.id}`)}
            className="p-4 flex items-center justify-between gap-3 hover:bg-zinc-50 cursor-pointer transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-zinc-900 font-medium text-sm truncate">
                {client.legal_name ?? <span className="text-zinc-400 italic">Unnamed</span>}
              </p>
              <p className="text-zinc-500 text-xs truncate mt-0.5">{client.email ?? "—"}</p>
              <div className="flex items-center gap-3 mt-2">
                <StatusBadge status={client.status} />
                <StepBar step={client.current_step} />
              </div>
            </div>
            <svg className="w-4 h-4 text-zinc-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  )
}
