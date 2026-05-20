import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()
  const { subscribed, add_tag_id, remove_tag_id } = body

  // Handle tag assignment
  if (add_tag_id) {
    const { error } = await supabaseAdmin
      .from("email_contact_tags")
      .upsert({ contact_id: params.id, tag_id: add_tag_id }, { onConflict: "contact_id,tag_id" })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Handle tag removal
  if (remove_tag_id) {
    const { error } = await supabaseAdmin
      .from("email_contact_tags")
      .delete()
      .eq("contact_id", params.id)
      .eq("tag_id", remove_tag_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Handle subscription toggle
  if (typeof subscribed !== "boolean") {
    return NextResponse.json({ error: "subscribed (boolean), add_tag_id, or remove_tag_id required" }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("email_contacts")
    .update({ subscribed })
    .eq("id", params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { error } = await supabaseAdmin.from("email_contacts").delete().eq("id", params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
