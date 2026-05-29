import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { sesClient, SES_CONFIGURATION_SET } from "@/lib/ses"
import { SendEmailCommand } from "@aws-sdk/client-ses"
import { requireAuth } from "@/lib/require-auth"

export const maxDuration = 300

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()
  const { subject: overrideSubject, scheduled_at } = body

  const { data: campaign, error: cErr } = await supabaseAdmin
    .from("email_campaigns")
    .select("*, email_senders(*), email_templates(*)")
    .eq("id", params.id)
    .single()

  if (cErr || !campaign) return NextResponse.json({ error: "campaign not found" }, { status: 404 })

  // Paginate RPC in chunks to bypass PostgREST project-level max_rows cap
  const RPC_PAGE = 1000
  let rpcPage = 0
  const allContacts: Array<{ email: string; name: string | null; opened: boolean }> = []
  while (true) {
    const { data, error: rpcErr } = await supabaseAdmin
      .rpc("get_campaign_contacts_with_opens", { p_campaign_id: params.id })
      .range(rpcPage * RPC_PAGE, (rpcPage + 1) * RPC_PAGE - 1)
    if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 })
    if (!data || data.length === 0) break
    allContacts.push(...(data as typeof allContacts))
    if (data.length < RPC_PAGE) break
    rpcPage++
  }

  if (allContacts.length === 0) {
    return NextResponse.json({ error: "no sends found for this campaign" }, { status: 400 })
  }

  // Filter to eligible unopened contacts — need subscribed/bounced/complained status too
  const unopenedEmails = (allContacts as Array<{ email: string; name: string | null; opened: boolean }>)
    .filter(c => !c.opened)
    .map(c => c.email)

  if (unopenedEmails.length === 0) {
    return NextResponse.json({ error: "all recipients have already opened this campaign" }, { status: 400 })
  }

  // Fetch contact eligibility (subscribed, bounced, complained) for unopened contacts
  const eligibleContacts: Array<{ id: string; email: string; name: string | null }> = []
  for (let i = 0; i < unopenedEmails.length; i += 1000) {
    const { data: contacts } = await supabaseAdmin
      .from("email_contacts")
      .select("id, email, name, subscribed, bounced, complained")
      .in("email", unopenedEmails.slice(i, i + 1000))
      .eq("subscribed", true)
      .eq("bounced", false)
      .eq("complained", false)
    if (contacts) eligibleContacts.push(...contacts)
  }

  if (eligibleContacts.length === 0) {
    return NextResponse.json({ error: "no eligible unopened contacts" }, { status: 400 })
  }

  // If scheduling, create a new campaign record and return without sending
  if (scheduled_at) {
    const { data: newCampaign, error: createErr } = await supabaseAdmin
      .from("email_campaigns")
      .insert({
        client_id: campaign.client_id,
        sender_id: campaign.sender_id,
        template_id: campaign.template_id,
        tag_ids: campaign.tag_ids ?? [],
        subject: overrideSubject ?? campaign.subject,
        status: "scheduled",
        scheduled_at,
      })
      .select("id")
      .single()
    if (createErr || !newCampaign) return NextResponse.json({ error: "failed to create resend campaign" }, { status: 500 })
    return NextResponse.json({ scheduled: true, id: newCampaign.id, total: eligibleContacts.length })
  }

  // Create a new campaign record for this resend
  const { data: newCampaign, error: createErr } = await supabaseAdmin
    .from("email_campaigns")
    .insert({
      client_id: campaign.client_id,
      sender_id: campaign.sender_id,
      template_id: campaign.template_id,
      tag_ids: campaign.tag_ids ?? [],
      subject: overrideSubject ?? campaign.subject,
      status: "sending",
    })
    .select("id")
    .single()

  if (createErr || !newCampaign) return NextResponse.json({ error: "failed to create resend campaign" }, { status: 500 })

  const newCampaignId = newCampaign.id
  const subject = overrideSubject ?? campaign.subject
  let sent = 0
  let failed = 0
  const BATCH = 10

  for (let i = 0; i < eligibleContacts.length; i += BATCH) {
    const batch = eligibleContacts.slice(i, i + BATCH)
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
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: { Html: { Data: finalHtml, Charset: "UTF-8" } },
        },
        ConfigurationSetName: SES_CONFIGURATION_SET,
      })

      const res = await sesClient.send(cmd)
      return res.MessageId ?? null
    }))

    const rows = results.map((r, idx) => ({
      campaign_id: newCampaignId,
      contact_id: batch[idx].id,
      ses_message_id: r.status === "fulfilled" ? r.value : null,
      status: r.status === "fulfilled" ? "sent" : "failed",
      ...(r.status === "fulfilled" ? { sent_at: new Date().toISOString() } : {}),
    }))

    await supabaseAdmin.from("email_sends").insert(rows)

    const batchSent = rows.filter(r => r.status === "sent").length
    sent += batchSent
    failed += rows.length - batchSent

    // Checkpoint after each batch so a timeout leaves a partial count, not zero
    await supabaseAdmin
      .from("email_campaigns")
      .update({ sent_count: sent })
      .eq("id", newCampaignId)
  }

  await supabaseAdmin
    .from("email_campaigns")
    .update({ status: "sent", sent_at: new Date().toISOString(), sent_count: sent })
    .eq("id", newCampaignId)

  return NextResponse.json({ sent, failed, id: newCampaignId })
}
