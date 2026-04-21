"use client"

import { signOut } from "next-auth/react"

interface HeaderProps {
  email: string
}

export default function Header({ email }: HeaderProps) {
  return (
    <header className="h-14 flex items-center justify-between px-4 lg:px-6 border-b border-[#003434] bg-[#001a1a]/90 backdrop-blur-sm sticky top-0 z-10 shrink-0">
      {/* Mobile brand (hidden on desktop — sidebar has it) */}
      <div className="flex items-center gap-2.5 lg:hidden">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#003434] to-[#70BF4B] flex items-center justify-center shadow shadow-[#70BF4B]/20">
          <span className="text-[#D0F255] font-bold text-xs">E</span>
        </div>
        <span className="text-white font-semibold text-sm">Emozi Admin</span>
      </div>

      {/* Desktop spacer */}
      <div className="hidden lg:block" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#003434] border border-[#70BF4B]/10">
          <div className="w-1.5 h-1.5 rounded-full bg-[#70BF4B] animate-pulse" />
          <span className="text-zinc-400 text-xs font-mono">{email}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-zinc-500 hover:text-zinc-200 border border-[#003434] hover:border-[#70BF4B]/30 px-3 py-1.5 rounded-lg transition-all"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
