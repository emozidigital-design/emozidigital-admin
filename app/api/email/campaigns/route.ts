import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("client_id")

  let query = supabaseAdmin
    .from("email_campaigns")
    .select("*, email_senders(from_email, from_name), email_templates(name), email_lists(name, contact_count)")
    .order("created_at", { ascending: false })

  if (clientId) query = query.eq("client_id", clientId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await req.json()
  const { client_id, sender_id, template_id, list_id, subject, scheduled_at } = body

  if (!client_id || !sender_id || !template_id || !list_id || !subject) {
    return NextResponse.json({ error: "client_id, sender_id, template_id, list_id, subject required" }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("email_campaigns")
    .insert({ client_id, sender_id, template_id, list_id, subject, scheduled_at: scheduled_at ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
