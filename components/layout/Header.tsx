"use client"

import { signOut } from "next-auth/react"

interface HeaderProps {
  email: string
}

export default function Header({ email }: HeaderProps) {
  return (
    <header className="h-14 flex items-center justify-between px-4 lg:px-6 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10 shrink-0">
      {/* Mobile brand (hidden on desktop — sidebar has it) */}
      <div className="flex items-center gap-2.5 lg:hidden">
        <img src="/Emozi.png" alt="Emozi Logo" className="w-7 h-7 object-contain" />
        <span className="text-white font-semibold text-sm">Emozi Admin</span>
      </div>

      {/* Desktop spacer */}
      <div className="hidden lg:block" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-zinc-300 text-xs font-mono">{email}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 px-3 py-1.5 rounded-lg transition-all"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
