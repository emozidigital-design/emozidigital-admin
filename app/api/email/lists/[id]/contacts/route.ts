import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()

  const { data: list } = await supabaseAdmin.from("email_lists").select("client_id").eq("id", params.id).single()
  if (!list) return NextResponse.json({ error: "list not found" }, { status: 404 })

  // Bulk import all eligible contacts for this client
  if (body.all) {
    const { data: contacts } = await supabaseAdmin
      .from("email_contacts")
      .select("id")
      .eq("client_id", list.client_id)
      .eq("subscribed", true)
      .eq("bounced", false)
      .eq("complained", false)

    if (!contacts?.length) return NextResponse.json({ imported: 0 })

    const rows = contacts.map(c => ({ list_id: params.id, contact_id: c.id }))
    await supabaseAdmin.from("email_list_contacts").upsert(rows, { onConflict: "list_id,contact_id" })

    return NextResponse.json({ imported: contacts.length })
  }

  // Single contact by email
  const { email } = body
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 })

  const { data: contact } = await supabaseAdmin
    .from("email_contacts")
    .select("id")
    .eq("email", email)
    .eq("client_id", list.client_id)
    .single()

  if (!contact) return NextResponse.json({ error: "contact not found for this client" }, { status: 404 })

  const { error } = await supabaseAdmin
    .from("email_list_contacts")
    .upsert({ list_id: params.id, contact_id: contact.id }, { onConflict: "list_id,contact_id" })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
