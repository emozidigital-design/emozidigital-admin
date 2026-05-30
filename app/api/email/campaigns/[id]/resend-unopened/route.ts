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

  // Single query: eligible (subscribed, not bounced, not complained) contacts who never opened.
  // Replaces the old two-step: RPC(email+opened) → re-query email_contacts by email.
  type EligibleContact = { id: string; email: string; name: string | null }
  const eligibleContacts: EligibleContact[] = []
  const PAGE = 1000
  let page = 0
  while (true) {
    const { data, error } = await supabaseAdmin
      .rpc("get_campaign_eligible_unopened", { p_campaign_id: params.id })
      .range(page * PAGE, (page + 1) * PAGE - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    eligibleContacts.push(...(data as EligibleContact[]))
    if (data.length < PAGE) break
    page++
  }

  if (eligibleContacts.length === 0) {
    return NextResponse.json({ error: "no eligible unopened contacts" }, { status: 400 })
  }

  const subject = overrideSubject ?? campaign.subject

  // If scheduling, create a draft campaign record and return
  if (scheduled_at) {
    const { data: newCampaign, error: createErr } = await supabaseAdmin
      .from("email_campaigns")
      .insert({
        client_id: campaign.client_id,
        sender_id: campaign.sender_id,
        template_id: campaign.template_id,
        tag_ids: campaign.tag_ids ?? [],
        subject,
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
      subject,
      status: "sending",
    })
    .select("id")
    .single()

  if (createErr || !newCampaign) return NextResponse.json({ error: "failed to create resend campaign" }, { status: 500 })

  const newCampaignId = newCampaign.id
  let sent = 0
  let failed = 0
  const BATCH = 10

  for (let i = 0; i < eligibleContacts.length; i += BATCH) {
    const batch = eligibleContacts.slice(i, i + BATCH)
    const results = await Promise.allSettled(batch.map(async (contact) => {
      const firstName = contact.name ?? "there"
      const htmlBody = (campaign.email_templates.html_body as string)
        .replace(/\{\{first_name\}\}/gi, firstName)
        .replace(/\{\{name\}\}/gi, firstName)
        .replace(/\{\{email\}\}/gi, contact.email)

      const unsubLink = `${process.env.NEXTAUTH_URL}/api/email/unsubscribe?email=${encodeURIComponent(contact.email)}&client=${campaign.client_id}`
      const finalHtml = htmlBody.includes("{{unsubscribe}}")
        ? htmlBody.replace(/\{\{unsubscribe\}\}/gi, unsubLink)
        : htmlBody + `<br/><br/><small><a href="${unsubLink}">Unsubscribe</a></small>`

      const personalizedSubject = subject
        .replace(/\{\{first_name\}\}/gi, firstName)
        .replace(/\{\{name\}\}/gi, firstName)

      const cmd = new SendEmailCommand({
        Source: `${campaign.email_senders.from_name} <${campaign.email_senders.from_email}>`,
        Destination: { ToAddresses: [contact.email] },
        Message: {
          Subject: { Data: personalizedSubject, Charset: "UTF-8" },
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

    const batchIndex = i / BATCH
    const isLastBatch = i + BATCH >= eligibleContacts.length
    if (!isLastBatch && batchIndex % 5 === 4) {
      await supabaseAdmin
        .from("email_campaigns")
        .update({ sent_count: sent })
        .eq("id", newCampaignId)
    }
  }

  await supabaseAdmin
    .from("email_campaigns")
    .update({ status: "sent", sent_at: new Date().toISOString(), sent_count: sent })
    .eq("id", newCampaignId)

  return NextResponse.json({ sent, failed, id: newCampaignId })
}
