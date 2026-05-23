import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/require-auth"

export async function GET(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("client_id")
  if (!clientId) return NextResponse.json({ error: "client_id required" }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from("email_tags")
    .select("*, email_contact_tags(count)")
    .eq("client_id", clientId)
    .order("name", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tags = (data ?? []).map((t: Record<string, unknown>) => {
    const countArr = t.email_contact_tags as { count: number }[] | null
    const contact_count = countArr?.[0]?.count ?? 0
    const { email_contact_tags: _, ...rest } = t
    return { ...rest, contact_count }
  })

  return NextResponse.json(tags)
}

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()
  const { client_id, name } = body

  if (!client_id || !name?.trim()) {
    return NextResponse.json({ error: "client_id and name required" }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("email_tags")
    .insert({ client_id, name: name.trim() })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Tag already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
