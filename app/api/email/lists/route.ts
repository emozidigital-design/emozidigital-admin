import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function GET(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("client_id")

  let query = supabaseAdmin
    .from("email_lists")
    .select("*, email_list_tags(tag_id, email_tags(id, name))")
    .order("created_at", { ascending: false })

  if (clientId) query = query.eq("client_id", clientId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const lists = (data ?? []).map((l: Record<string, unknown>) => {
    const junctions = (l.email_list_tags as { email_tags: { id: string; name: string } | null }[] | null) ?? []
    const tags = junctions.map(j => j.email_tags).filter((t): t is { id: string; name: string } => t !== null)
    const { email_list_tags: _, ...rest } = l
    return { ...rest, tags }
  })

  return NextResponse.json(lists)
}

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()
  const { client_id, name, contact_ids, tag_ids } = body

  if (!client_id || !name) {
    return NextResponse.json({ error: "client_id and name required" }, { status: 400 })
  }

  const { data: list, error } = await supabaseAdmin
    .from("email_lists")
    .insert({ client_id, name, contact_count: contact_ids?.length ?? 0 })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tagIdsArr: string[] = Array.isArray(tag_ids) ? tag_ids : (tag_ids ? [tag_ids] : [])

  if (tagIdsArr.length) {
    await supabaseAdmin
      .from("email_list_tags")
      .upsert(tagIdsArr.map(tid => ({ list_id: list.id, tag_id: tid })), { onConflict: "list_id,tag_id" })
  }

  if (contact_ids?.length) {
    const junctions = (contact_ids as string[]).map(cid => ({ list_id: list.id, contact_id: cid }))
    await supabaseAdmin.from("email_list_contacts").insert(junctions)
  }

  // Return with tags included
  const { data: fullList } = await supabaseAdmin
    .from("email_lists")
    .select("*, email_list_tags(tag_id, email_tags(id, name))")
    .eq("id", list.id)
    .single()

  if (!fullList) return NextResponse.json(list, { status: 201 })

  const junctions = (fullList.email_list_tags as { email_tags: { id: string; name: string } | null }[] | null) ?? []
  const tags = junctions.map((j: { email_tags: { id: string; name: string } | null }) => j.email_tags).filter((t: unknown): t is { id: string; name: string } => t !== null)
  const { email_list_tags: _, ...rest } = fullList

  return NextResponse.json({ ...rest, tags }, { status: 201 })
}
