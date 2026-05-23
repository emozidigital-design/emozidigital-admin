import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { data, error } = await supabaseAdmin
    .from("email_contact_tags")
    .select("email_contacts(id, first_name, last_name, email, phone)")
    .eq("tag_id", params.id)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const contacts = (data ?? [])
    .map((r: Record<string, unknown>) => r.email_contacts)
    .filter(Boolean)

  return NextResponse.json({ contacts })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { contact_id } = await req.json()
  if (!contact_id) return NextResponse.json({ error: "contact_id required" }, { status: 400 })

  const { error } = await supabaseAdmin
    .from("email_contact_tags")
    .delete()
    .eq("tag_id", params.id)
    .eq("contact_id", contact_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
