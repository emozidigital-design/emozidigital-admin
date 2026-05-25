import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { client_id, emails } = await req.json()
  if (!client_id || !Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json({ existing: [] })
  }

  const normalised = emails.map((e: string) => e.toLowerCase().trim())

  const { data, error } = await supabaseAdmin
    .from("email_contacts")
    .select("email")
    .eq("client_id", client_id)
    .in("email", normalised)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ existing: (data ?? []).map(r => r.email) })
}
