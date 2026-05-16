"use client"

import { useState, useEffect } from "react"

interface EmailEvent {
  id: string
  ses_message_id: string | null
  event_type: string
  processed_at: string
}

const EVENT_STYLE: Record<string, string> = {
  delivery: "bg-emerald-50 text-emerald-700 border-emerald-200",
  bounce: "bg-red-50 text-red-700 border-red-200",
  complaint: "bg-orange-50 text-orange-700 border-orange-200",
  open: "bg-blue-50 text-blue-700 border-blue-200",
  click: "bg-violet-50 text-violet-700 border-violet-200",
}

export default function TransactionalPage() {
  const [events, setEvents] = useState<EmailEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Direct Supabase query via the API
    fetch("/api/email/events")
      .then(r => r.json())
      .then(d => setEvents(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Transactional</h1>
        <p className="text-sm text-zinc-500 mt-1">SNS event log — bounces, complaints, deliveries, opens, clicks</p>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-zinc-400">No events yet. SNS events will appear here after the webhook is confirmed.</p>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Event</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Message ID</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Time</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${EVENT_STYLE[ev.event_type] ?? "bg-zinc-100 text-zinc-600 border-zinc-200"}`}>
                      {ev.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-400 truncate max-w-[240px]">{ev.ses_message_id ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-400">{new Date(ev.processed_at).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
