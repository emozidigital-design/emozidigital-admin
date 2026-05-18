import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { sesClient, SES_CONFIGURATION_SET } from "@/lib/ses"
import { SendEmailCommand } from "@aws-sdk/client-ses"
import { requireAuth } from "@/lib/require-auth"

function buildNewsletterHtml(opts: {
  senderName: string
  category: string
  title: string
  excerpt: string
  coverImageUrl: string | null
  ctaUrl: string
  unsubscribeUrl: string
}) {
  const coverHtml = opts.coverImageUrl
    ? `<tr><td><img src="${opts.coverImageUrl}" alt="${opts.title}" width="600" style="display:block;width:100%;max-width:600px;height:auto;" /></td></tr>`
    : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background:#003434;padding:20px 32px;">
            <p style="margin:0;color:#ffffff;font-size:14px;font-weight:600;letter-spacing:0.01em;">${opts.senderName}</p>
          </td>
        </tr>
        ${coverHtml}
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 10px;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">${opts.category}</p>
            <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#09090b;line-height:1.3;">${opts.title}</h1>
            <p style="margin:0 0 28px;font-size:15px;color:#52525b;line-height:1.65;">${opts.excerpt}</p>
            <a href="${opts.ctaUrl}" style="display:inline-block;background:#003434;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">Read the full article &rarr;</a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f4f4f5;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;line-height:1.6;">
              You received this email because you subscribed to our newsletter.<br>
              <a href="${opts.unsubscribeUrl}" style="color:#a1a1aa;text-decoration:underline;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()
  const { blog_post_id, sender_id, subject, client_id, recipient_type, list_id } = body

  if (!blog_post_id || !sender_id || !subject || !recipient_type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }
  if (recipient_type === "list" && !list_id) {
    return NextResponse.json({ error: "list_id required when recipient_type is list" }, { status: 400 })
  }

  // Fetch blog post
  const { data: post, error: postErr } = await supabaseAdmin
    .from("blog_posts")
    .select("id, title, slug, category, excerpt, cover_image_url, author")
    .eq("id", blog_post_id)
    .single()

  if (postErr || !post) {
    return NextResponse.json({ error: "Blog post not found" }, { status: 404 })
  }

  // Fetch sender
  const { data: sender, error: senderErr } = await supabaseAdmin
    .from("email_senders")
    .select("from_name, from_email")
    .eq("id", sender_id)
    .single()

  if (senderErr || !sender) {
    return NextResponse.json({ error: "Sender not found" }, { status: 404 })
  }

  // Fetch recipients
  type Recipient = { email: string; name: string | null }
  let recipients: Recipient[] = []

  if (recipient_type === "leads") {
    let query = supabaseAdmin.from("lead_list").select("email, name").not("email", "is", null)
    if (client_id) query = query.eq("client_id", client_id)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    recipients = (data ?? []).filter(r => r.email)
  } else {
    const { data, error } = await supabaseAdmin
      .from("email_list_contacts")
      .select("email_contacts(email, name, subscribed, bounced, complained)")
      .eq("list_id", list_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    recipients = (data ?? [])
      .map(r => r.email_contacts as unknown as { email: string; name: string | null; subscribed: boolean; bounced: boolean; complained: boolean })
      .filter(c => c && c.subscribed && !c.bounced && !c.complained)
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No eligible recipients found" }, { status: 400 })
  }

  // Create newsletter_sends record
  const { data: record, error: recErr } = await supabaseAdmin
    .from("newsletter_sends")
    .insert({
      client_id: client_id || null,
      blog_post_id,
      sender_id,
      subject,
      recipient_type,
      list_id: list_id || null,
      status: "sending",
    })
    .select("id")
    .single()

  if (recErr || !record) {
    return NextResponse.json({ error: "Failed to create newsletter record" }, { status: 500 })
  }

  const blogBaseUrl = process.env.BLOG_BASE_URL ?? "https://emozidigital.com/blog"
  const ctaUrl = `${blogBaseUrl}/${post.slug}`

  let sent = 0
  let failed = 0
  const BATCH = 10

  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH)
    const results = await Promise.allSettled(
      batch.map(async (recipient) => {
        const unsubUrl = `${process.env.NEXTAUTH_URL}/api/email/unsubscribe?email=${encodeURIComponent(recipient.email)}&client=${client_id ?? ""}`
        const html = buildNewsletterHtml({
          senderName: sender.from_name,
          category: post.category ?? "Newsletter",
          title: post.title,
          excerpt: post.excerpt ?? "",
          coverImageUrl: post.cover_image_url ?? null,
          ctaUrl,
          unsubscribeUrl: unsubUrl,
        })

        const cmd = new SendEmailCommand({
          Source: `${sender.from_name} <${sender.from_email}>`,
          Destination: { ToAddresses: [recipient.email] },
          Message: {
            Subject: { Data: subject, Charset: "UTF-8" },
            Body: { Html: { Data: html, Charset: "UTF-8" } },
          },
          ConfigurationSetName: SES_CONFIGURATION_SET,
        })

        await sesClient.send(cmd)
      })
    )

    sent += results.filter(r => r.status === "fulfilled").length
    failed += results.filter(r => r.status === "rejected").length
  }

  const finalStatus = failed === recipients.length ? "failed" : "sent"
  await supabaseAdmin
    .from("newsletter_sends")
    .update({ status: finalStatus, sent_count: sent, failed_count: failed, sent_at: new Date().toISOString() })
    .eq("id", record.id)

  return NextResponse.json({ sent, failed, total: recipients.length })
}
