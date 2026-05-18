"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { ClientContext } from "./client-context"

interface Sender {
  client_id: string
  from_name: string
  domain: string
}

export default function EmailLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isSubSection = pathname !== "/email"
  const [clientId, setClientIdState] = useState("")
  const [senders, setSenders] = useState<Sender[]>([])

  useEffect(() => {
    const stored = localStorage.getItem("email_client_id") ?? ""
    setClientIdState(stored)
    fetch("/api/email/senders")
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setSenders(d) : [])
  }, [])

  const setClientId = (id: string) => {
    setClientIdState(id)
    localStorage.setItem("email_client_id", id)
  }

  const clients = Object.values(
    senders.reduce((acc, s) => {
      if (!acc[s.client_id]) acc[s.client_id] = { client_id: s.client_id, label: `${s.from_name} · ${s.domain}` }
      return acc
    }, {} as Record<string, { client_id: string; label: string }>)
  )

  return (
    <ClientContext.Provider value={{ clientId, setClientId, clients }}>
      <div>
        {isSubSection && (
          <button
            onClick={() => router.push("/email")}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}
        {clients.length > 0 && (
          <div className="mb-5 flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-2.5">
            <span className="text-xs font-semibold text-zinc-500 shrink-0">Client</span>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="flex-1 text-sm text-zinc-800 bg-transparent focus:outline-none min-w-0"
            >
              <option value="">All clients</option>
              {clients.map(c => (
                <option key={c.client_id} value={c.client_id}>{c.label}</option>
              ))}
            </select>
            {clientId && (
              <>
                <span className="text-xs text-zinc-300 font-mono hidden sm:block truncate max-w-[200px]">{clientId}</span>
                <button onClick={() => setClientId("")} className="text-xs text-zinc-400 hover:text-zinc-600 shrink-0">Clear</button>
              </>
            )}
          </div>
        )}
        {children}
      </div>
    </ClientContext.Provider>
  )
}
