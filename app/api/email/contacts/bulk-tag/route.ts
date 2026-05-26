import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { client_id, emails, tag_ids } = await req.json()

  if (!client_id || !Array.isArray(emails) || !emails.length || !Array.isArray(tag_ids) || !tag_ids.length) {
    return NextResponse.json({ error: "client_id, emails[], and tag_ids[] required" }, { status: 400 })
  }

  // Fetch contact IDs for the given emails (lowercased, in batches of 500)
  const normalised = emails.map((e: string) => e.toLowerCase().trim())
  const ids: string[] = []
  const CHUNK = 500
  for (let i = 0; i < normalised.length; i += CHUNK) {
    const chunk = normalised.slice(i, i + CHUNK)
    const { data, error } = await supabaseAdmin
      .from("email_contacts")
      .select("id")
      .eq("client_id", client_id)
      .in("email", chunk)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    ids.push(...(data ?? []).map((r: { id: string }) => r.id))
  }

  if (!ids.length) return NextResponse.json({ tagged: 0 })

  const tagRows = ids.flatMap(contact_id =>
    tag_ids.map((tag_id: string) => ({ contact_id, tag_id }))
  )

  const { error: tagError } = await supabaseAdmin
    .from("email_contact_tags")
    .upsert(tagRows, { onConflict: "contact_id,tag_id" })

  if (tagError) return NextResponse.json({ error: tagError.message }, { status: 500 })

  return NextResponse.json({ tagged: ids.length })
}
