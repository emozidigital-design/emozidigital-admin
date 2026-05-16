import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { sesClient, SES_CONFIGURATION_SET } from "@/lib/ses"
import { SendEmailCommand } from "@aws-sdk/client-ses"
import { requireAuth } from "@/lib/require-auth"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const campaignId = params.id

  // Fetch campaign with related data
  const { data: campaign, error: cErr } = await supabaseAdmin
    .from("email_campaigns")
    .select("*, email_senders(*), email_templates(*), email_lists(*)")
    .eq("id", campaignId)
    .single()

  if (cErr || !campaign) return NextResponse.json({ error: "campaign not found" }, { status: 404 })
  if (campaign.status !== "draft" && campaign.status !== "scheduled") {
    return NextResponse.json({ error: "campaign already sent" }, { status: 409 })
  }

  // Get contacts in the list
  const { data: listContacts, error: lcErr } = await supabaseAdmin
    .from("email_list_contacts")
    .select("email_contacts(id, email, name, subscribed, bounced, complained)")
    .eq("list_id", campaign.list_id)

  if (lcErr) return NextResponse.json({ error: lcErr.message }, { status: 500 })

  const contacts = listContacts
    ?.map(r => r.email_contacts as unknown as { id: string; email: string; name: string | null; subscribed: boolean; bounced: boolean; complained: boolean })
    .filter(c => c && c.subscribed && !c.bounced && !c.complained) ?? []

  if (contacts.length === 0) {
    return NextResponse.json({ error: "no eligible contacts in this list" }, { status: 400 })
  }

  // Mark campaign as sending
  await supabaseAdmin
    .from("email_campaigns")
    .update({ status: "sending" })
    .eq("id", campaignId)

  let sent = 0
  let failed = 0
  const BATCH = 10

  for (let i = 0; i < contacts.length; i += BATCH) {
    const batch = contacts.slice(i, i + BATCH)
    const results = await Promise.allSettled(batch.map(async (contact) => {
      const htmlBody = (campaign.email_templates.html_body as string)
        .replace(/\{\{name\}\}/gi, contact.name ?? "there")
        .replace(/\{\{email\}\}/gi, contact.email)

      const unsubLink = `${process.env.NEXTAUTH_URL}/api/email/unsubscribe?email=${encodeURIComponent(contact.email)}&client=${campaign.client_id}`
      const finalHtml = htmlBody.includes("{{unsubscribe}}")
        ? htmlBody.replace(/\{\{unsubscribe\}\}/gi, unsubLink)
        : htmlBody + `<br/><br/><small><a href="${unsubLink}">Unsubscribe</a></small>`

      const cmd = new SendEmailCommand({
        Source: `${campaign.email_senders.from_name} <${campaign.email_senders.from_email}>`,
        Destination: { ToAddresses: [contact.email] },
        Message: {
          Subject: { Data: campaign.subject, Charset: "UTF-8" },
          Body: { Html: { Data: finalHtml, Charset: "UTF-8" } },
        },
        ConfigurationSetName: SES_CONFIGURATION_SET,
      })

      const res = await sesClient.send(cmd)
      return res.MessageId ?? null
    }))

    const rows = results.map((r, idx) => ({
      campaign_id: campaignId,
      contact_id: batch[idx].id,
      ses_message_id: r.status === "fulfilled" ? r.value : null,
      status: r.status === "fulfilled" ? "sent" : "failed",
      ...(r.status === "fulfilled" ? { sent_at: new Date().toISOString() } : {}),
    }))

    await supabaseAdmin.from("email_sends").insert(rows)

    sent += results.filter(r => r.status === "fulfilled").length
    failed += results.filter(r => r.status === "rejected").length
  }

  await supabaseAdmin
    .from("email_campaigns")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", campaignId)

  return NextResponse.json({ sent, failed })
}
