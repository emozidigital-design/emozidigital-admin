import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { sesClient, SES_CONFIGURATION_SET } from "@/lib/ses"
import { SendEmailCommand } from "@aws-sdk/client-ses"
import { requireAuth } from "@/lib/require-auth"

const TEST_EMAIL = "emozidigital@gmail.com"

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { data: campaign, error } = await supabaseAdmin
    .from("email_campaigns")
    .select("*, email_senders(*), email_templates(*)")
    .eq("id", params.id)
    .single()

  if (error || !campaign) return NextResponse.json({ error: "campaign not found" }, { status: 404 })

  const htmlBody = (campaign.email_templates.html_body as string)
    .replace(/\{\{first_name\}\}/gi, "Test User")
    .replace(/\{\{name\}\}/gi, "Test User")
    .replace(/\{\{agent_name\}\}/gi, "Test Agency")
    .replace(/\{\{email\}\}/gi, TEST_EMAIL)
    .replace(/\{\{unsubscribe\}\}/gi, "#")

  const subject = campaign.subject
    .replace(/\{\{first_name\}\}/gi, "Test User")
    .replace(/\{\{name\}\}/gi, "Test User")
    .replace(/\{\{agent_name\}\}/gi, "Test Agency")

  const cmd = new SendEmailCommand({
    Source: `${campaign.email_senders.from_name} <${campaign.email_senders.from_email}>`,
    Destination: { ToAddresses: [TEST_EMAIL] },
    Message: {
      Subject: { Data: `[TEST] ${subject}`, Charset: "UTF-8" },
      Body: { Html: { Data: htmlBody, Charset: "UTF-8" } },
    },
    ConfigurationSetName: SES_CONFIGURATION_SET,
  })

  try {
    await sesClient.send(cmd)
    return NextResponse.json({ ok: true, sent_to: TEST_EMAIL })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
