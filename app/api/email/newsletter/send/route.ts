import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { getAgentBazarSupabase } from "@/lib/supabase-agentbazar"
import { sesClient, SES_CONFIGURATION_SET } from "@/lib/ses"
import { SendEmailCommand } from "@aws-sdk/client-ses"
import { requireAuth } from "@/lib/require-auth"

const AGENTBAZAR_CLIENT_ID = "d5104fcd-defe-4e3d-a4cf-1893dba7b931"
const AGENTBAZAR_BLOG_URL = "https://blog.agentbazar.in"

function applyNewsletterTemplate(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "")
}

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
  trending: Array<{ title: string; excerpt?: string; coverImage: string | null; url: string }>
  unsubscribeUrl: string
}) {
  const heroCoverHtml = opts.hero.coverImage
    ? `<tr><td style="padding:16px 24px 0;"><a href="${opts.hero.url}" style="display:block;border-radius:12px;overflow:hidden;"><img src="${opts.hero.coverImage}" alt="${opts.hero.title}" width="552" style="display:block;width:100%;height:auto;border-radius:12px;border:2px solid #e4e9f0;" /></a></td></tr>`
    : ""

  const trendingRows = opts.trending.map(p => `
        <tr><td style="padding:8px 24px 0;">
          <hr style="border:none;border-top:1px solid #e8ecf2;margin:0;" />
        </td></tr>
        ${p.coverImage ? `<tr><td style="padding:16px 24px 0;"><a href="${p.url}" style="display:block;border-radius:12px;overflow:hidden;"><img src="${p.coverImage}" alt="${p.title}" width="552" style="display:block;width:100%;height:auto;border-radius:12px;border:2px solid #e4e9f0;" /></a></td></tr>` : ""}
        <tr><td style="padding:16px 24px 8px;">
          <a href="${p.url}" style="display:block;font-size:18px;font-weight:bold;color:#F47920;text-decoration:none;line-height:1.3;margin-bottom:10px;">${p.title}</a>
          ${p.excerpt ? `<p style="margin:0 0 16px;font-size:14px;color:#1a2332;line-height:1.65;">${p.excerpt}</p>` : ""}
          <a href="${p.url}" style="display:inline-block;background:#F47920;color:#ffffff;text-decoration:none;padding:10px 28px;border-radius:4px;font-size:14px;font-weight:bold;font-style:italic;">Read More...</a>
        </td></tr>`).join("")

  const trendingSection = opts.trending.length > 0 ? `
        <tr>
          <td style="padding:20px 24px 8px;">
            <p style="margin:0;font-size:16px;font-weight:bold;color:#1a2332;font-style:italic;text-decoration:underline;">Trending Today</p>
          </td>
        </tr>
        ${trendingRows}
        <tr><td style="padding:16px 24px 0;"></td></tr>` : ""

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
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:600px;width:100%;border-radius:16px;overflow:hidden;">

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
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer: white background, BW Travel-style centered layout -->
        <tr>
          <td style="background:#ffffff;padding:32px 24px 24px;border-top:1px solid #e8ecf2;">

            <!-- Logo -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="text-align:center;padding-bottom:20px;">
                  <img src="https://blog.agentbazar.in/new-logo.jpg" alt="AgentBazar" height="48" style="height:48px;max-height:48px;border:0;display:inline-block;" />
                  <p style="margin:4px 0 0;font-size:11px;color:#999999;letter-spacing:0.05em;text-transform:uppercase;"><span style="color:#999999;text-decoration:none;">AGENTBAZAR&#8203;.IN</span></p>
                </td>
              </tr>

              <!-- Social icons: black circle, white icons — using table cells for max email-client compatibility -->
              <tr>
                <td style="text-align:center;padding-bottom:20px;">
                  <table cellpadding="0" cellspacing="0" style="display:inline-table;">
                    <tr>
                      <td style="padding:0 5px;">
                        <a href="https://www.facebook.com/people/Agentbazarblogs/" title="Facebook" style="display:block;width:38px;height:38px;background:#111111;border-radius:19px;text-align:center;text-decoration:none;line-height:38px;font-size:0;">
                          <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" style="display:block;"><circle cx="12" cy="12" r="12" fill="#111111"/><path fill="#ffffff" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </a>
                      </td>
                      <td style="padding:0 5px;">
                        <a href="https://x.com/AgentBazar" title="X" style="display:block;width:38px;height:38px;background:#111111;border-radius:19px;text-align:center;text-decoration:none;line-height:38px;font-size:0;">
                          <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" style="display:block;"><circle cx="12" cy="12" r="12" fill="#111111"/><path fill="#ffffff" d="M13.6 11.15 18.34 5.5h-1.13l-4.14 4.82L9.72 5.5H5.8l5.03 7.32-5.03 5.68h1.13l4.4-5.12 3.51 5.12H14.2zm-1.56 1.81-.5-.72-4.01-5.74h1.73l3.24 4.63.5.72 4.22 6.04h-1.73z"/></svg>
                        </a>
                      </td>
                      <td style="padding:0 5px;">
                        <a href="https://www.instagram.com/agentbazarblogs/" title="Instagram" style="display:block;width:38px;height:38px;background:#111111;border-radius:19px;text-align:center;text-decoration:none;line-height:38px;font-size:0;">
                          <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" style="display:block;"><circle cx="12" cy="12" r="12" fill="#111111"/><rect x="6.5" y="6.5" width="11" height="11" rx="3" fill="none" stroke="#ffffff" stroke-width="1.5"/><circle cx="12" cy="12" r="3" fill="none" stroke="#ffffff" stroke-width="1.5"/><circle cx="16.2" cy="7.8" r="0.9" fill="#ffffff"/></svg>
                        </a>
                      </td>
                      <td style="padding:0 5px;">
                        <a href="https://www.youtube.com/@agentbazar6074" title="YouTube" style="display:block;width:38px;height:38px;background:#111111;border-radius:19px;text-align:center;text-decoration:none;line-height:38px;font-size:0;">
                          <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" style="display:block;"><circle cx="12" cy="12" r="12" fill="#111111"/><path fill="#ffffff" d="M19.6 8.6a2.4 2.4 0 0 0-1.7-1.7C16.6 6.5 12 6.5 12 6.5s-4.6 0-5.9.4A2.4 2.4 0 0 0 4.4 8.6C4 9.9 4 12 4 12s0 2.1.4 3.4a2.4 2.4 0 0 0 1.7 1.7c1.3.4 5.9.4 5.9.4s4.6 0 5.9-.4a2.4 2.4 0 0 0 1.7-1.7C20 14.1 20 12 20 12s0-2.1-.4-3.4zm-8.9 5.5V9.9l3.9 2.1z"/></svg>
                        </a>
                      </td>
                      <td style="padding:0 5px;">
                        <a href="https://www.whatsapp.com/channel/0029VaCTkLJBFLgcbBhFnM1C" title="WhatsApp" style="display:block;width:38px;height:38px;background:#111111;border-radius:19px;text-align:center;text-decoration:none;line-height:38px;font-size:0;">
                          <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" style="display:block;"><circle cx="12" cy="12" r="12" fill="#111111"/><path fill="#ffffff" d="M12 4.8a7.2 7.2 0 0 0-6.3 10.7L4.5 19.5l4.1-1.4A7.2 7.2 0 1 0 12 4.8zm3.9 9.9c-.2.5-.9.9-1.4 1-.4.1-.9.1-2.5-.6-2.1-1-3.4-3.1-3.5-3.2-.1-.2-.8-1.1-.8-2.2s.6-1.5.8-1.7l.6-.3h.4c.1 0 .3.1.5.5.2.5.7 1.7.7 1.8.1.1.1.3 0 .4-.1.2-.2.3-.3.5-.2.1-.3.3-.2.5.4.6.9 1.2 1.6 1.7.5.3 1 .5 1.5.6.2.1.4 0 .5-.2.2-.2.5-.7.7-.9.1-.2.3-.2.5-.1l1.5.8c.2.1.3.2.4.3-.1.4-.2.8-.5 1.1z"/></svg>
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Nav links: centered horizontal -->
              <tr>
                <td style="text-align:center;padding-bottom:18px;">
                  <a href="https://www.agentbazar.in" style="color:#111111;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.05em;margin:0 10px;">HOME</a>
                  <a href="https://www.agentbazar.in/about-us" style="color:#111111;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.05em;margin:0 10px;">ABOUT US</a>
                  <a href="https://blog.agentbazar.in" style="color:#111111;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.05em;margin:0 10px;">BLOG</a>
                  <a href="https://www.agentbazar.in/help" style="color:#111111;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.05em;margin:0 10px;">HELP</a>
                </td>
              </tr>

              <!-- Contact info -->
              <tr>
                <td style="text-align:center;padding-bottom:6px;">
                  <p style="margin:0 0 4px;font-size:13px;font-weight:bold;color:#111111;">For Enquiries, please contact:</p>
                  <p style="margin:0 0 3px;font-size:13px;color:#333333;">
                    <a href="tel:+919435009519" style="color:#333333;text-decoration:none;">+91-9435009519</a>
                    &nbsp;&nbsp;
                    <a href="mailto:support@agentbazar.in" style="color:#333333;text-decoration:none;">support@agentbazar.in</a>
                  </p>
                  <p style="margin:0;font-size:12px;color:#666666;">Tripforu Holidays Pvt. Ltd. (Guwahati)</p>
                </td>
              </tr>

              <!-- Divider -->
              <tr>
                <td style="padding:18px 0 14px;">
                  <hr style="border:none;border-top:1px solid #e8ecf2;margin:0;" />
                </td>
              </tr>

              <!-- Unsubscribe: prominent like BW Travel -->
              <tr>
                <td style="text-align:center;padding-bottom:10px;">
                  <a href="${opts.unsubscribeUrl}" style="color:#111111;text-decoration:underline;font-size:13px;font-weight:bold;">Unsubscribe from AgentBazar</a>
                </td>
              </tr>

              <!-- Copyright -->
              <tr>
                <td style="text-align:center;">
                  <p style="margin:0;font-size:12px;font-weight:bold;color:#111111;">AgentBazar &copy;2025</p>
                </td>
              </tr>

            </table>
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
  const { blog_post_id, sender_id, subject, client_id, recipient_type, list_id, newsletter_template_id } = body
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
  type TrendingPost = { id: string; title: string; slug: string; cover_image: string | null; excerpt: string | null }
  let trendingPosts: TrendingPost[] = []
  if (isAgentBazar && trending_post_ids.length > 0) {
    const { data } = await getAgentBazarSupabase()
      .from("blog_posts")
      .select("id, title, slug, cover_image, excerpt")
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

  // Fetch newsletter template if provided
  let newsletterTemplateHtml: string | null = null
  if (newsletter_template_id) {
    const { data: tmpl } = await supabaseAdmin
      .from("email_templates")
      .select("html_body, client_id, template_type")
      .eq("id", newsletter_template_id)
      .eq("template_type", "newsletter")
      .single()
    if (tmpl && tmpl.client_id === (client_id ?? null)) {
      newsletterTemplateHtml = tmpl.html_body
    }
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

        const firstName = (recipient.name ?? "").trim().split(/\s+/)[0] || "Traveller"

        let html: string
        if (newsletterTemplateHtml) {
          html = applyNewsletterTemplate(newsletterTemplateHtml, {
            first_name: firstName,
            hero_image_url: post!.cover_image_url ?? "",
            hero_url: ctaUrl,
            hero_title: post!.title,
            hero_excerpt: post!.excerpt ?? "",
            trending_1_image_url: trendingPosts[0]?.cover_image ?? "",
            trending_1_url: trendingPosts[0] ? `${AGENTBAZAR_BLOG_URL}/${trendingPosts[0].slug}` : "",
            trending_1_title: trendingPosts[0]?.title ?? "",
            trending_1_excerpt: trendingPosts[0]?.excerpt ?? "",
            trending_2_image_url: trendingPosts[1]?.cover_image ?? "",
            trending_2_url: trendingPosts[1] ? `${AGENTBAZAR_BLOG_URL}/${trendingPosts[1].slug}` : "",
            trending_2_title: trendingPosts[1]?.title ?? "",
            trending_2_excerpt: trendingPosts[1]?.excerpt ?? "",
            unsubscribe_url: unsubUrl,
            client_name: sender.from_name,
          })
        } else if (isAgentBazar) {
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
              excerpt: p.excerpt ?? "",
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
