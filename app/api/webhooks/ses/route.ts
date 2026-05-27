import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createHash } from "crypto"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// SNS sends all notification types here
export async function POST(req: NextRequest) {
  const body = await req.text()
  let msg: Record<string, unknown>

  try {
    msg = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  // Handle SNS subscription confirmation (one-time)
  if (msg.Type === "SubscriptionConfirmation") {
    const url = msg.SubscribeURL as string
    if (url && url.startsWith("https://") && url.includes("amazonaws.com")) {
      await fetch(url) // confirms the subscription
    }
    return NextResponse.json({ ok: true })
  }

  if (msg.Type !== "Notification") {
    return NextResponse.json({ ok: true })
  }

  let notification: Record<string, unknown>
  try {
    notification = JSON.parse(msg.Message as string)
  } catch {
    return NextResponse.json({ error: "invalid notification" }, { status: 400 })
  }

  const eventType = notification.eventType as string
  const mail = notification.mail as Record<string, unknown> | undefined
  const rawMsgId = (mail?.messageId as string) ?? null
  // SES SNS payloads for Open/Click events wrap the message ID in angle brackets
  // (e.g. "<0102abc...@us-east-1.amazonses.com>") while the SES SDK returns the
  // bare ID. Strip them so the value matches what is stored in email_sends.
  const sesMessageId = rawMsgId ? rawMsgId.replace(/^<|>$/g, "").trim() : null

  // Log raw event
  await supabase.from("email_events").insert({
    ses_message_id: sesMessageId,
    event_type: eventType?.toLowerCase() ?? "unknown",
    raw_payload: notification,
  })

  // Update contact suppression on bounce/complaint
  if (eventType === "Bounce") {
    const bounce = notification.bounce as Record<string, unknown>
    const recipients = (bounce?.bouncedRecipients as Array<{ emailAddress: string }>) ?? []
    for (const r of recipients) {
      await supabase
        .from("email_contacts")
        .update({ bounced: true, subscribed: false })
        .eq("email", r.emailAddress)
    }
  }

  if (eventType === "Complaint") {
    const complaint = notification.complaint as Record<string, unknown>
    const recipients = (complaint?.complainedRecipients as Array<{ emailAddress: string }>) ?? []
    for (const r of recipients) {
      await supabase
        .from("email_contacts")
        .update({ complained: true, subscribed: false })
        .eq("email", r.emailAddress)
    }
  }

  // Update send status on delivery
  if (eventType === "Delivery" && sesMessageId) {
    await supabase
      .from("email_sends")
      .update({ status: "delivered" })
      .eq("ses_message_id", sesMessageId)
  }

  // Increment opens_count / clicks_count on the parent newsletter batch (if this is a newsletter send)
  if ((eventType === "Open" || eventType === "Click") && sesMessageId) {
    const { data: sendRow } = await supabase
      .from("email_sends")
      .select("newsletter_send_id")
      .eq("ses_message_id", sesMessageId)
      .single()
    if (sendRow?.newsletter_send_id) {
      const rpc = eventType === "Open" ? "increment_newsletter_opens" : "increment_newsletter_clicks"
      await supabase.rpc(rpc, { p_id: sendRow.newsletter_send_id })
    }
  }

  return NextResponse.json({ ok: true })
}
