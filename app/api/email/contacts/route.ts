import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function GET(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("client_id")
  const search = searchParams.get("search")

  let query = supabaseAdmin
    .from("email_contacts")
    .select("*, email_contact_tags(tag_id, email_tags(id, name))")
    .order("created_at", { ascending: false })
    .limit(2000)

  if (clientId) query = query.eq("client_id", clientId)
  if (search) query = query.ilike("email", `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Flatten nested tag structure to contacts[].tags = [{ id, name }]
  const contacts = (data ?? []).map((c: Record<string, unknown>) => {
    const tagJunctions = (c.email_contact_tags as { email_tags: { id: string; name: string } | null }[] | null) ?? []
    const tags = tagJunctions
      .map(j => j.email_tags)
      .filter((t): t is { id: string; name: string } => t !== null)
    const { email_contact_tags: _, ...rest } = c
    return { ...rest, tags }
  })

  return NextResponse.json(contacts)
}

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()
  const {
    client_id, email, name, metadata, tag_ids,
    first_name, last_name, phone, alternate_phone, company,
    street_address, street_number, neighborhood, postal_code, city,
    state_province, country, tax_number, language,
    user_name, user_type, agent_name, agent_id, agent_registered_date,
    agent_pancard_no, agent_gst_number,
    ...rest
  } = body

  if (!client_id || !email) {
    return NextResponse.json({ error: "client_id and email required" }, { status: 400 })
  }

  // Collect any dynamic custom_ columns passed in rest
  const customCols: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(rest)) {
    if (k.startsWith("custom_")) customCols[k] = v
  }

  const { data, error } = await supabaseAdmin
    .from("email_contacts")
    .upsert({
      client_id, email, name, metadata: metadata ?? {},
      first_name, last_name, phone, alternate_phone, company,
      street_address, street_number, neighborhood, postal_code, city,
      state_province, country, tax_number, language,
      user_name, user_type, agent_name, agent_id, agent_registered_date,
      agent_pancard_no, agent_gst_number,
      ...customCols,
    }, { onConflict: "client_id,email" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tagIdsArr: string[] = Array.isArray(tag_ids) ? tag_ids : (tag_ids ? [tag_ids] : [])
  if (tagIdsArr.length) {
    await supabaseAdmin
      .from("email_contact_tags")
      .upsert(tagIdsArr.map(tid => ({ contact_id: data.id, tag_id: tid })), { onConflict: "contact_id,tag_id" })
  }

  const tags = tagIdsArr.length
    ? (await supabaseAdmin.from("email_contact_tags").select("tag_id, email_tags(id, name)").eq("contact_id", data.id)).data
        ?.map((j: Record<string, unknown>) => j.email_tags as { id: string; name: string } | null)
        .filter((t: unknown): t is { id: string; name: string } => t !== null) ?? []
    : []

  return NextResponse.json({ ...data, tags }, { status: 201 })
}
