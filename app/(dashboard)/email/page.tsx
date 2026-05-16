"use client"

import Link from "next/link"

const SECTIONS = [
  { href: "/email/senders", label: "Senders", desc: "Domain verification & DKIM status", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { href: "/email/templates", label: "Templates", desc: "HTML + JSON variable templates", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { href: "/email/contacts", label: "Contacts", desc: "CSV import, manual add & subscriber list", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/email/lists", label: "Lists", desc: "Segments per client", icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
  { href: "/email/campaigns", label: "Campaigns", desc: "Marketing bulk sends & scheduling", icon: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8" },
  { href: "/email/transactional", label: "Transactional", desc: "API-triggered single sends (logs only)", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { href: "/email/analytics", label: "Analytics", desc: "Opens, clicks, bounces per campaign", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
]

export default function EmailPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-900">Email</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage campaigns, contacts, and transactional sends via AWS SES</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map(s => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex flex-col gap-3 p-5 bg-white border border-zinc-200 rounded-xl hover:border-[#003434] hover:shadow-sm transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-zinc-50 group-hover:bg-[#003434]/5 flex items-center justify-center border border-zinc-200 group-hover:border-[#003434]/20 transition-colors">
              <svg className="w-4 h-4 text-zinc-500 group-hover:text-[#003434] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={s.icon} />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-800 group-hover:text-[#003434] transition-colors">{s.label}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
