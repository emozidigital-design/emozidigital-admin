import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { getAgentBazarSupabase } from "@/lib/supabase-agentbazar"
import { sesClient, SES_CONFIGURATION_SET } from "@/lib/ses"
import { SendEmailCommand } from "@aws-sdk/client-ses"
import { requireAuth } from "@/lib/require-auth"

const AGENTBAZAR_CLIENT_ID = "d5104fcd-defe-4e3d-a4cf-1893dba7b931"
const AGENTBAZAR_BLOG_URL = "https://blog.agentbazar.in"

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

function buildAgentBazarNewsletterHtml(opts: {
  firstName: string
  hero: { title: string; excerpt: string; coverImage: string | null; url: string }
  trending: Array<{ title: string; coverImage: string | null; url: string }>
  unsubscribeUrl: string
}) {
  const heroCoverHtml = opts.hero.coverImage
    ? `<tr><td style="padding:0;"><a href="${opts.hero.url}" style="display:block;"><img src="${opts.hero.coverImage}" alt="${opts.hero.title}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" /></a></td></tr>`
    : ""

  const trendingCols = opts.trending.map(p => `
    <td width="${Math.floor(100 / opts.trending.length)}%" style="padding:4px;vertical-align:top;">
      ${p.coverImage ? `<a href="${p.url}" style="display:block;margin-bottom:8px;"><img src="${p.coverImage}" alt="${p.title}" width="272" style="display:block;width:100%;height:auto;border:0;" /></a>` : ""}
      <a href="${p.url}" style="font-size:13px;color:#F47920;text-decoration:none;line-height:1.4;font-weight:600;">${p.title}</a>
    </td>`).join("")

  const trendingSection = opts.trending.length > 0 ? `
        <tr>
          <td style="padding:20px 24px 8px;">
            <p style="margin:0;font-size:16px;font-weight:bold;color:#1a2332;font-style:italic;text-decoration:underline;">Trending Today</p>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 24px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>${trendingCols}</tr>
            </table>
          </td>
        </tr>` : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${opts.hero.title}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:600px;width:100%;">

        <!-- Logo header: blue top strip → white with logo → orange bottom strip -->
        <tr>
          <td style="padding:0;background:#ffffff;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="background:#001D4A;height:10px;font-size:1px;line-height:1px;"> </td></tr>
              <tr><td style="background:#ffffff;padding:10px 24px;text-align:center;">
                <img src="https://blog.agentbazar.in/new-logo.jpg" alt="AgentBazar" height="52" style="height:52px;max-height:52px;border:0;display:inline-block;" />
              </td></tr>
              <tr><td style="background:#F47920;height:10px;font-size:1px;line-height:1px;"> </td></tr>
            </table>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:20px 24px 12px;border-bottom:2px solid #F47920;">
            <p style="margin:0 0 2px;font-style:italic;font-size:16px;color:#1a2332;">Hello ${opts.firstName},</p>
            <p style="margin:0;font-size:14px;font-weight:bold;color:#1a2332;">Today&#39;s Highlight</p>
          </td>
        </tr>

        <!-- Hero cover image -->
        ${heroCoverHtml}

        <!-- Hero content -->
        <tr>
          <td style="padding:20px 24px 8px;">
            <a href="${opts.hero.url}" style="display:block;font-size:20px;font-weight:bold;color:#F47920;text-decoration:none;line-height:1.3;margin-bottom:12px;">${opts.hero.title}</a>
            <a href="${opts.hero.url}" style="display:block;margin:0 0 20px;font-size:14px;color:#1a2332;text-decoration:none;line-height:1.65;font-weight:600;">${opts.hero.excerpt}</a>
            <a href="${opts.hero.url}" style="display:inline-block;background:#F47920;color:#ffffff;text-decoration:none;padding:10px 28px;border-radius:4px;font-size:14px;font-weight:bold;font-style:italic;">Read Full Blog...</a>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:20px 24px 0;">
            <hr style="border:none;border-top:1px solid #e8ecf2;margin:0;" />
          </td>
        </tr>

        <!-- Trending Today section -->
        ${trendingSection}

        <!-- WhatsApp community banner -->
        <tr>
          <td style="padding:0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#1a6b3a;padding:28px 24px;text-align:center;">
                  <p style="margin:0 0 4px;font-size:13px;color:#ffffff;letter-spacing:0.02em;">For the latest Travel Blog &amp; Updates</p>
                  <p style="margin:0 0 18px;font-size:20px;font-weight:bold;color:#ffffff;line-height:1.3;">Join Our WhatsApp Community Now</p>
                  <a href="https://wa.me/919435009519" style="display:inline-block;background:#ffffff;color:#1a6b3a;text-decoration:none;padding:10px 36px;border-radius:24px;font-size:14px;font-weight:bold;">&#9654;&nbsp; JOIN NOW</a>
                  <p style="margin:18px 0 0;font-size:11px;color:rgba(255,255,255,0.75);">Tripforu Holidays Pvt. Ltd. (Guwahati) &nbsp; www.agentbazar.in</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#001D4A;padding:24px;text-align:center;">
            <p style="margin:0 0 10px;font-size:13px;color:#ffffff;">
              +91-9435009519 &nbsp;&nbsp; support@agentbazar.in
            </p>
            <p style="margin:0 0 14px;">
              <a href="https://www.agentbazar.in" style="color:#8aaac8;text-decoration:none;font-size:12px;margin:0 8px;">HOME</a>
              <a href="https://www.agentbazar.in/about-us" style="color:#8aaac8;text-decoration:none;font-size:12px;margin:0 8px;">ABOUT US</a>
              <a href="https://blog.agentbazar.in" style="color:#8aaac8;text-decoration:none;font-size:12px;margin:0 8px;">BLOG</a>
              <a href="https://www.agentbazar.in/help" style="color:#8aaac8;text-decoration:none;font-size:12px;margin:0 8px;">HELP</a>
            </p>
            <p style="margin:0 0 10px;font-size:11px;color:#6688aa;">
              <a href="${opts.unsubscribeUrl}" style="color:#6688aa;text-decoration:underline;">Unsubscribe</a>
            </p>
            <p style="margin:0;font-size:11px;color:#6688aa;">&copy; Copyright 2025 by Tripforu Holidays Pvt. Ltd.</p>
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
  const trending_post_ids: string[] = Array.isArray(body.trending_post_ids) ? body.trending_post_ids.slice(0, 2) : []

  if (!blog_post_id || !sender_id || !subject || !recipient_type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }
  if (recipient_type === "list" && !list_id) {
    return NextResponse.json({ error: "list_id required when recipient_type is list" }, { status: 400 })
  }

  const isAgentBazar = client_id === AGENTBAZAR_CLIENT_ID

  // Fetch hero blog post from correct project
  let post: { id: string; title: string; slug: string; category: string | null; excerpt: string | null; cover_image_url?: string | null; cover_image?: string | null } | null = null

  if (isAgentBazar) {
    const { data, error } = await getAgentBazarSupabase()
      .from("blog_posts")
      .select("id, title, slug, category, excerpt, cover_image")
      .eq("id", blog_post_id)
      .single()
    if (error || !data) return NextResponse.json({ error: "Blog post not found" }, { status: 404 })
    post = { ...data, cover_image_url: data.cover_image }
  } else {
    const { data, error } = await supabaseAdmin
      .from("blog_posts")
      .select("id, title, slug, category, excerpt, cover_image_url, author")
      .eq("id", blog_post_id)
      .single()
    if (error || !data) return NextResponse.json({ error: "Blog post not found" }, { status: 404 })
    post = data
  }

  // Fetch up to 2 trending posts (AgentBazar only)
  type TrendingPost = { id: string; title: string; slug: string; cover_image: string | null }
  let trendingPosts: TrendingPost[] = []
  if (isAgentBazar && trending_post_ids.length > 0) {
    const { data } = await getAgentBazarSupabase()
      .from("blog_posts")
      .select("id, title, slug, cover_image")
      .in("id", trending_post_ids)
    trendingPosts = data ?? []
    // preserve order from the request
    trendingPosts.sort((a, b) => trending_post_ids.indexOf(a.id) - trending_post_ids.indexOf(b.id))
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

  const blogBaseUrl = isAgentBazar ? AGENTBAZAR_BLOG_URL : (process.env.BLOG_BASE_URL ?? "https://emozidigital.com/blog")
  const ctaUrl = `${blogBaseUrl}/${post!.slug}`

  let sent = 0
  let failed = 0
  const BATCH = 10

  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH)
    const results = await Promise.allSettled(
      batch.map(async (recipient) => {
        const unsubUrl = `${process.env.NEXTAUTH_URL}/api/email/unsubscribe?email=${encodeURIComponent(recipient.email)}&client=${client_id ?? ""}`

        let html: string
        if (isAgentBazar) {
          const firstName = (recipient.name ?? "").trim().split(/\s+/)[0] || "Traveller"
          html = buildAgentBazarNewsletterHtml({
            firstName,
            hero: {
              title: post!.title,
              excerpt: post!.excerpt ?? "",
              coverImage: post!.cover_image_url ?? null,
              url: ctaUrl,
            },
            trending: trendingPosts.map(p => ({
              title: p.title,
              coverImage: p.cover_image,
              url: `${AGENTBAZAR_BLOG_URL}/${p.slug}`,
            })),
            unsubscribeUrl: unsubUrl,
          })
        } else {
          html = buildNewsletterHtml({
            senderName: sender.from_name,
            category: post!.category ?? "Newsletter",
            title: post!.title,
            excerpt: post!.excerpt ?? "",
            coverImageUrl: post!.cover_image_url ?? null,
            ctaUrl,
            unsubscribeUrl: unsubUrl,
          })
        }

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
