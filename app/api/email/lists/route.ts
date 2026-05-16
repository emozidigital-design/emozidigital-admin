import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("client_id")

  let query = supabaseAdmin.from("email_lists").select("*").order("created_at", { ascending: false })
  if (clientId) query = query.eq("client_id", clientId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await req.json()
  const { client_id, name, contact_ids } = body

  if (!client_id || !name) {
    return NextResponse.json({ error: "client_id and name required" }, { status: 400 })
  }

  const { data: list, error } = await supabaseAdmin
    .from("email_lists")
    .insert({ client_id, name, contact_count: contact_ids?.length ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach contacts if provided
  if (contact_ids?.length) {
    const junctions = (contact_ids as string[]).map(cid => ({ list_id: list.id, contact_id: cid }))
    await supabaseAdmin.from("email_list_contacts").insert(junctions)
  }

  return NextResponse.json(list, { status: 201 })
}
