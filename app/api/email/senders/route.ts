import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { sesClient } from "@/lib/ses"
import { GetIdentityVerificationAttributesCommand, VerifyDomainDkimCommand } from "@aws-sdk/client-ses"
import { requireAuth } from "@/lib/require-auth"

export async function GET(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("client_id")

  let query = supabaseAdmin.from("email_senders").select("*").order("created_at", { ascending: false })
  if (clientId) query = query.eq("client_id", clientId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()
  const { client_id, from_email, from_name } = body

  if (!client_id || !from_email || !from_name) {
    return NextResponse.json({ error: "client_id, from_email, from_name required" }, { status: 400 })
  }

  const domain = from_email.split("@")[1]
  if (!domain) return NextResponse.json({ error: "invalid email" }, { status: 400 })

  // Request DKIM tokens from SES
  let dkimTokens: string[] = []
  try {
    const cmd = new VerifyDomainDkimCommand({ Domain: domain })
    const res = await sesClient.send(cmd)
    dkimTokens = res.DkimTokens ?? []
  } catch (e) {
    console.error("SES DKIM error", e)
  }

  const { data, error } = await supabaseAdmin
    .from("email_senders")
    .insert({ client_id, from_email, from_name, domain, dkim_status: "pending" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ...data, dkim_tokens: dkimTokens }, { status: 201 })
}
