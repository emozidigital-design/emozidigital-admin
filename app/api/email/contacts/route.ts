import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("client_id")
  const search = searchParams.get("search")

  let query = supabaseAdmin
    .from("email_contacts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500)

  if (clientId) query = query.eq("client_id", clientId)
  if (search) query = query.ilike("email", `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await req.json()
  const { client_id, email, name, metadata } = body

  if (!client_id || !email) {
    return NextResponse.json({ error: "client_id and email required" }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("email_contacts")
    .upsert({ client_id, email, name, metadata: metadata ?? {} }, { onConflict: "client_id,email" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
