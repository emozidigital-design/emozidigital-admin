import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get("page") ?? "1", 10)
  const limit = parseInt(url.searchParams.get("limit") ?? "20", 10)
  const safeLimit = [10, 20, 50].includes(limit) ? limit : 20
  const offset = (page - 1) * safeLimit

  // Step 1: get contact_ids for this tag, ordered by when they were tagged
  const { data: tagRows, error: tagError, count } = await supabaseAdmin
    .from("email_contact_tags")
    .select("contact_id, created_at", { count: "exact" })
    .eq("tag_id", params.id)
    .order("created_at", { ascending: true })
    .order("contact_id", { ascending: true })
    .range(offset, offset + safeLimit - 1)

  if (tagError) return NextResponse.json({ error: tagError.message }, { status: 500 })

  const contactIds = (tagRows ?? []).map((r: { contact_id: string }) => r.contact_id)

  if (contactIds.length === 0) {
    return NextResponse.json({ contacts: [], total: count ?? 0, page, limit: safeLimit })
  }

  // Step 2: fetch full contact details, then re-sort to match tag-join order
  const { data: contacts, error: contactError } = await supabaseAdmin
    .from("email_contacts")
    .select("id, first_name, last_name, email, phone")
    .in("id", contactIds)

  if (contactError) return NextResponse.json({ error: contactError.message }, { status: 500 })

  const idOrder = new Map(contactIds.map((id, i) => [id, i]))
  const sorted = (contacts ?? []).slice().sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0))

  return NextResponse.json({ contacts: sorted, total: count ?? 0, page, limit: safeLimit })
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
