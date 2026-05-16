import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"
import { sesClient } from "@/lib/ses"
import { GetIdentityVerificationAttributesCommand } from "@aws-sdk/client-ses"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { data: sender, error: fetchErr } = await supabaseAdmin
    .from("email_senders")
    .select("domain")
    .eq("id", params.id)
    .single()

  if (fetchErr || !sender) return NextResponse.json({ error: "not found" }, { status: 404 })

  const cmd = new GetIdentityVerificationAttributesCommand({ Identities: [sender.domain] })
  const res = await sesClient.send(cmd)
  const attrs = res.VerificationAttributes?.[sender.domain]
  const status = attrs?.VerificationStatus === "Success" ? "verified" : "pending"

  await supabaseAdmin
    .from("email_senders")
    .update({ dkim_status: status, verified_at: status === "verified" ? new Date().toISOString() : null })
    .eq("id", params.id)

  return NextResponse.json({ dkim_status: status })
}
