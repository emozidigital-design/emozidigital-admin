// Lightweight endpoint polled every 10s by the newsletters and statistics pages.
// Returns only opens_count, clicks_count, sent_count, status for the requested IDs —
// avoids the expensive full list re-fetch on each tick.
import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export const revalidate = 0

export async function GET(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { searchParams } = new URL(req.url)
  const campaignIds   = searchParams.get("campaign_ids")?.split(",").filter(Boolean) ?? []
  const newsletterIds = searchParams.get("newsletter_ids")?.split(",").filter(Boolean) ?? []

  const [cRes, nRes] = await Promise.all([
    campaignIds.length > 0
      ? supabaseAdmin
          .from("email_campaigns")
          .select("id, sent_count, opens_count, clicks_count, status")
          .in("id", campaignIds)
      : Promise.resolve({ data: [], error: null }),
    newsletterIds.length > 0
      ? supabaseAdmin
          .from("newsletter_sends")
          .select("id, sent_count, opens_count, clicks_count, status")
          .in("id", newsletterIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (cRes.error) return NextResponse.json({ error: cRes.error.message }, { status: 500 })
  if (nRes.error) return NextResponse.json({ error: nRes.error.message }, { status: 500 })

  const res = NextResponse.json({
    campaigns:   cRes.data ?? [],
    newsletters: nRes.data ?? [],
  })
  res.headers.set("Cache-Control", "no-store")
  return res
}
