import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { sesClient } from "@/lib/ses"
import { GetIdentityVerificationAttributesCommand } from "@aws-sdk/client-ses"
import { requireAuth } from "@/lib/require-auth"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

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
