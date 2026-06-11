// Vercel cron job — runs every 6 hours.
// Deletes email_events rows older than 72 hours to keep the table small.
import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

  const { error, count } = await supabaseAdmin
    .from("email_events")
    .delete({ count: "exact" })
    .lt("processed_at", cutoff)

  if (error) {
    console.error("[cron/cleanup-email-events]", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[cron/cleanup-email-events] deleted ${count} rows older than ${cutoff}`)
  return NextResponse.json({ deleted: count })
}
