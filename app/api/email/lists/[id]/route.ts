import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()
  const updates: Record<string, unknown> = {}

  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim()
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabaseAdmin.from("email_lists").update(updates).eq("id", params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Replace tag set if tag_ids provided
  if ("tag_ids" in body) {
    const tagIds: string[] = Array.isArray(body.tag_ids) ? body.tag_ids : []
    await supabaseAdmin.from("email_list_tags").delete().eq("list_id", params.id)
    if (tagIds.length) {
      await supabaseAdmin
        .from("email_list_tags")
        .upsert(tagIds.map(tid => ({ list_id: params.id, tag_id: tid })), { onConflict: "list_id,tag_id" })
    }
  }

  const { data, error: fetchErr } = await supabaseAdmin
    .from("email_lists")
    .select("*, email_list_tags(tag_id, email_tags(id, name))")
    .eq("id", params.id)
    .single()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const junctions = (data.email_list_tags as { email_tags: { id: string; name: string } | null }[] | null) ?? []
  const tags = junctions.map((j: { email_tags: { id: string; name: string } | null }) => j.email_tags).filter((t: unknown): t is { id: string; name: string } => t !== null)
  const { email_list_tags: _, ...rest } = data

  return NextResponse.json({ ...rest, tags })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  await supabaseAdmin.from("email_list_contacts").delete().eq("list_id", params.id)
  const { error } = await supabaseAdmin.from("email_lists").delete().eq("id", params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
