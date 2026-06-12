import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { client_id, emails, agent_ids } = await req.json()
  if (!client_id) return NextResponse.json({ existing: [] })

  const existingEmails = new Set<string>()

  // Check by email
  if (Array.isArray(emails) && emails.length > 0) {
    const normalised = emails.map((e: string) => e.toLowerCase().trim())
    const { data, error } = await supabaseAdmin
      .from("email_contacts")
      .select("email")
      .eq("client_id", client_id)
      .in("email", normalised)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    ;(data ?? []).forEach(r => existingEmails.add(r.email))
  }

  // Check by agent_id (returns matching emails so caller can cross-reference)
  if (Array.isArray(agent_ids) && agent_ids.length > 0) {
    const filtered = agent_ids.filter(Boolean)
    if (filtered.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("email_contacts")
        .select("email, agent_id")
        .eq("client_id", client_id)
        .in("agent_id", filtered)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      ;(data ?? []).forEach(r => existingEmails.add(r.email))
    }
  }

  return NextResponse.json({ existing: Array.from(existingEmails) })
}
