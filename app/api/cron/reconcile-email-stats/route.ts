// Vercel cron job — runs daily at 18:30 UTC (midnight IST).
// Also callable manually via POST from the admin UI (protected by session auth).
import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Vercel cron sends the Authorization header with the CRON_SECRET
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return run()
}

export async function POST(req: NextRequest) {
  // Manual trigger from admin UI — protected by normal session auth
  const unauth = await requireAuth()
  if (unauth) return unauth
  return run()
}

async function run() {
  const { data, error } = await supabaseAdmin.rpc("reconcile_email_stats")
  if (error) {
    console.error("[cron/reconcile-email-stats]", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  console.log("[cron/reconcile-email-stats] done", data)
  return NextResponse.json({ ok: true, ...data })
}
