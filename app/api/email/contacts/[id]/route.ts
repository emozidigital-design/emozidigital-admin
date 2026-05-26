import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

// Columns that can be directly updated on email_contacts
const ALLOWED_FIELDS = new Set([
  "name", "first_name", "last_name", "phone", "alternate_phone", "company",
  "street_address", "street_number", "neighborhood", "postal_code", "city",
  "state_province", "country", "tax_number", "language", "user_name", "user_type",
  "agent_name", "agent_id", "agent_registered_date", "agent_pancard_no", "agent_gst_number",
])

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()
  const { subscribed, add_tag_id, remove_tag_id, fields } = body

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
  if (typeof subscribed === "boolean") {
    const { data, error } = await supabaseAdmin
      .from("email_contacts")
      .update({ subscribed })
      .eq("id", params.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Handle bounce reset — clears bounced flag and re-subscribes
  if (body.reset_bounce === true) {
    const { data, error } = await supabaseAdmin
      .from("email_contacts")
      .update({ bounced: false, subscribed: true })
      .eq("id", params.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Handle direct field updates (standard + dynamic custom columns)
  if (fields && typeof fields === "object") {
    const update: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(fields)) {
      // Allow any column that starts with "custom_" (dynamically added) or is in the allowed set
      if (ALLOWED_FIELDS.has(key) || key.startsWith("custom_")) {
        update[key] = val
      }
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin
      .from("email_contacts")
      .update(update)
      .eq("id", params.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: "subscribed (boolean), add_tag_id, remove_tag_id, or fields (object) required" }, { status: 400 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { error } = await supabaseAdmin.from("email_contacts").delete().eq("id", params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
