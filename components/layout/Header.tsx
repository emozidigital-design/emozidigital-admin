"use client"

import { signOut } from "next-auth/react"

interface HeaderProps {
  email: string
}

export default function Header({ email }: HeaderProps) {
  return (
    <header className="h-14 flex items-center justify-between px-4 lg:px-6 border-b border-zinc-200 bg-white/90 backdrop-blur-sm sticky top-0 z-10 shrink-0">
      {/* Mobile brand (hidden on desktop — sidebar has it) */}
      <div className="flex items-center gap-2.5 lg:hidden">
        <img src="/Emozi.png" alt="Emozi Logo" className="w-7 h-7 object-contain" />
        <span className="text-[#003434] font-semibold text-sm">Emozi Admin</span>
      </div>

      {/* Desktop spacer */}
      <div className="hidden lg:block" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#003434]/5 border border-[#003434]/10">
          <div className="w-1.5 h-1.5 rounded-full bg-[#003434] animate-pulse" />
          <span className="text-[#003434]/70 text-xs font-mono">{email}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-[#003434] hover:text-[#003434]/80 border border-zinc-200 hover:border-[#003434]/30 px-3 py-1.5 rounded-lg transition-all"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
