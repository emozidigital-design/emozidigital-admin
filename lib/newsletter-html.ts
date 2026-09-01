// Builds newsletter HTML for both custom templates and the default layouts.
// Used by both the send and resend-unopened routes.

const AGENTBAZAR_BLOG_URL = "https://blog.agentbazar.in"

interface Post {
  id: string
  title: string
  slug: string
  category?: string | null
  excerpt?: string | null
  cover_image_url?: string | null
  cover_image?: string | null
}

interface TrendingPost {
  id: string
  title: string
  slug: string
  cover_image?: string | null
  excerpt?: string | null
}

interface BuildParams {
  recipientName: string | null
  recipientEmail: string
  recipientUserId: string | null
  post: Post
  trendingPosts: TrendingPost[]
  ctaUrl: string
  unsubBaseUrl: string
  isAgentBazar: boolean
  newsletterTemplateHtml: string | null
  clientId: string | null
  senderFromName: string
}

function buildUnsubLink(unsubBaseUrl: string, email: string, clientId: string | null): string {
  return `${unsubBaseUrl}/api/email/unsubscribe?email=${encodeURIComponent(email)}&client=${clientId ?? ""}`
}

function substituteTemplateVars(
  html: string,
  params: BuildParams,
): string {
  const {
    recipientName, recipientEmail, recipientUserId, post, trendingPosts,
    ctaUrl, unsubBaseUrl, clientId,
  } = params

  const coverUrl = post.cover_image_url ?? post.cover_image ?? ""
  const unsubUrl = buildUnsubLink(unsubBaseUrl, recipientEmail, clientId)

  const trending1 = trendingPosts[0]
  const trending2 = trendingPosts[1]
  const blogBase = params.isAgentBazar ? AGENTBAZAR_BLOG_URL : (process.env.BLOG_BASE_URL ?? "https://emozidigital.com/blog")

  return html
    .replace(/\{\{first_name\}\}/gi,        recipientName ?? "there")
    .replace(/\{\{name\}\}/gi,              recipientName ?? "there")
    .replace(/\{\{user_id\}\}/gi,           recipientUserId ?? "")
    .replace(/\{\{email\}\}/gi,             recipientEmail)
    .replace(/\{\{hero_title\}\}/gi,        post.title)
    .replace(/\{\{hero_excerpt\}\}/gi,      post.excerpt ?? "")
    .replace(/\{\{hero_url\}\}/gi,          ctaUrl)
    .replace(/\{\{hero_image_url\}\}/gi,    coverUrl)
    .replace(/\{\{trending_1_title\}\}/gi,  trending1?.title ?? "")
    .replace(/\{\{trending_1_url\}\}/gi,    trending1 ? `${blogBase}/${trending1.slug}` : "")
    .replace(/\{\{trending_2_title\}\}/gi,  trending2?.title ?? "")
    .replace(/\{\{trending_2_url\}\}/gi,    trending2 ? `${blogBase}/${trending2.slug}` : "")
    .replace(/\{\{unsubscribe_url\}\}/gi,   unsubUrl)
    .replace(/\{\{unsubscribe\}\}/gi,       unsubUrl)
}

function buildAgentBazarDefaultHtml(params: BuildParams): string {
  const { recipientName, recipientEmail, post, trendingPosts, ctaUrl, unsubBaseUrl, clientId } = params
  const coverUrl = post.cover_image_url ?? post.cover_image ?? ""
  const unsubUrl = buildUnsubLink(unsubBaseUrl, recipientEmail, clientId)
  const blogBase = AGENTBAZAR_BLOG_URL

  const trendingHtml = trendingPosts.map(tp => {
    const tpUrl = `${blogBase}/${tp.slug}`
    const tpImg = tp.cover_image ?? ""
    return `
      <tr><td style="padding:0 0 20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #eee;border-radius:8px;overflow:hidden;">
          ${tpImg ? `<tr><td><a href="${tpUrl}" style="display:block;"><img src="${tpImg}" alt="" width="600" style="display:block;width:100%;max-height:220px;object-fit:cover;" /></a></td></tr>` : ""}
          <tr><td style="padding:16px 20px;">
            <a href="${tpUrl}" style="text-decoration:none;"><p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#F47920;line-height:1.4;">${tp.title}</p></a>
            ${tp.excerpt ? `<a href="${tpUrl}" style="text-decoration:none;"><p style="margin:0 0 14px;font-size:13px;color:#555;line-height:1.6;">${tp.excerpt}</p></a>` : ""}
            <a href="${tpUrl}" style="display:inline-block;background:#F47920;color:#fff;font-size:13px;font-weight:700;font-style:italic;padding:8px 20px;border-radius:4px;text-decoration:none;">Read More...</a>
          </td></tr>
        </table>
      </td></tr>`
  }).join("")

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:20px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:600px;width:100%;">

      <!-- Header: dark bar + logo + orange bar -->
      <tr><td style="padding:0;background:#ffffff;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="background:#001D4A;height:10px;font-size:1px;line-height:1px;"> </td></tr>
          <tr><td style="background:#ffffff;padding:10px 24px;text-align:center;">
            <img src="https://blog.agentbazar.in/new-logo.jpg" alt="AgentBazar" height="52" style="height:52px;max-height:52px;border:0;display:inline-block;" />
          </td></tr>
          <tr><td style="background:#F47920;height:10px;font-size:1px;line-height:1px;"> </td></tr>
        </table>
      </td></tr>

      <!-- Hero image -->
      ${coverUrl ? `<tr><td><a href="${ctaUrl}" style="display:block;"><img src="${coverUrl}" alt="" width="600" style="display:block;width:100%;max-height:320px;object-fit:cover;" /></a></td></tr>` : ""}

      <!-- Hero content -->
      <tr><td style="padding:20px 24px 24px;">
        <a href="${ctaUrl}" style="text-decoration:none;"><p style="color:#F47920;font-weight:700;font-size:18px;line-height:1.4;margin:0 0 10px;">${post.title}</p></a>
        ${post.excerpt ? `<a href="${ctaUrl}" style="text-decoration:none;"><p style="color:#555;font-size:13px;line-height:1.6;margin:0 0 16px;">${post.excerpt}</p></a>` : ""}
        <a href="${ctaUrl}" style="display:inline-block;background:#F47920;color:#fff;font-size:13px;font-weight:700;font-style:italic;padding:10px 24px;border-radius:4px;text-decoration:none;">Read Full Blog...</a>
      </td></tr>

      <!-- Trending Today -->
      ${trendingHtml ? `<tr><td style="padding:0 24px 8px;">
        <p style="font-size:14px;font-weight:700;color:#001D4A;text-decoration:underline;margin:0 0 16px;">Trending Today</p>
        <table width="100%" cellpadding="0" cellspacing="0">${trendingHtml}</table>
      </td></tr>` : ""}

      <!-- Community card (WhatsApp + Telegram) -->
      <tr><td style="padding:4px 24px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(145deg,#fef3e2 0%,#fdf6ee 55%,#fef3e2 100%);border:1px solid #f5ddb8;border-radius:16px;overflow:hidden;">
          <tr><td style="background:linear-gradient(90deg,#f58220,#ff9c4a);height:4px;font-size:0;line-height:0;"> </td></tr>
          <tr><td align="center" style="padding:20px 20px 18px;">
            <p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;">Stay Connected With Agent Bazar</p>
            <p style="margin:0 0 16px;font-size:12px;color:#5a4a3a;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Join our WhatsApp &amp; Telegram communities for live airfare drops,<br/>fixed departures, urgent fare alerts, visa updates and B2B travel deals.</p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:0 6px 8px;">
                  <a href="https://www.whatsapp.com/channel/0029VaCTkLJBFLgcbBhFnM1C" style="display:inline-block;background:#25d366;color:#fff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;padding:11px 22px;border-radius:50px;white-space:nowrap;">
                    <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" width="18" height="18" style="vertical-align:middle;border:0;margin-right:7px;width:18px;height:18px;" /> Join WhatsApp
                  </a>
                </td>
                <td style="padding:0 6px 8px;">
                  <a href="https://t.me/AgentBazarB2b" style="display:inline-block;background:#0088cc;color:#fff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;padding:11px 24px;border-radius:50px;white-space:nowrap;">
                    <img src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png" width="18" height="18" style="vertical-align:middle;border:0;margin-right:7px;width:18px;height:18px;" /> Join Telegram
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:4px 0 0;font-size:11px;color:#a07050;font-family:Arial,Helvetica,sans-serif;">Real-time updates &bull; Faster response &bull; Exclusive B2B offers</p>
          </td></tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#1a3a6b;height:5px;font-size:0;line-height:0;padding:0;margin-top:20px;"> </td></tr>
      <tr><td align="center" style="background:#ffffff;padding:24px 20px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Nav links -->
          <tr><td align="center" style="padding-bottom:16px;font-size:13px;font-family:Arial,Helvetica,sans-serif;">
            <a href="https://agentbazar.in/home" style="color:#1a3a6b;text-decoration:none;margin:0 8px;font-weight:600;">Home</a>
            <span style="color:#9ab0d0;">|</span>
            <a href="https://blog.agentbazar.in/" style="color:#1a3a6b;text-decoration:none;margin:0 8px;font-weight:600;">Blogs</a>
            <span style="color:#9ab0d0;">|</span>
            <a href="https://agentbazar.in/contact" style="color:#1a3a6b;text-decoration:none;margin:0 8px;font-weight:600;">Contact Us</a>
          </td></tr>

          <tr><td style="height:1px;background:#dde6f0;font-size:0;line-height:0;padding:0;"> </td></tr>

          <!-- Social icons -->
          <tr><td align="center" style="padding:16px 0 12px;font-size:0;line-height:0;">
            <a href="https://www.facebook.com/agentbazar"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" width="36" height="36" style="display:inline-block;vertical-align:middle;margin:0 7px;border:0;border-radius:4px;width:36px;height:36px;" /></a>
            <a href="https://www.instagram.com/agentbazarblogs/"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" width="36" height="36" style="display:inline-block;vertical-align:middle;margin:0 7px;border:0;border-radius:4px;width:36px;height:36px;" /></a>
            <a href="https://www.youtube.com/@agentbazar6074"><img src="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" width="40" height="40" style="display:inline-block;vertical-align:middle;margin:0 6px;border:0;border-radius:5px;width:40px;height:40px;" /></a>
            <a href="https://x.com/AgentBazar"><img src="https://cdn-icons-png.flaticon.com/512/5968/5968830.png" width="36" height="36" style="display:inline-block;vertical-align:middle;margin:0 7px;border:0;border-radius:6px;background:#000;width:36px;height:36px;" /></a>
            <a href="https://www.linkedin.com/company/agentbazar/"><img src="https://cdn-icons-png.flaticon.com/512/3536/3536505.png" width="36" height="36" style="display:inline-block;vertical-align:middle;margin:0 7px;border:0;border-radius:4px;width:36px;height:36px;" /></a>
          </td></tr>

          <!-- Contact -->
          <tr><td align="center" style="padding:8px 0;font-size:12px;font-weight:600;font-family:Arial,Helvetica,sans-serif;color:#333;">
            ✆&nbsp;<a href="tel:+919435009519" style="color:#1a3a6b;text-decoration:none;">+91-9435009519</a>
            &nbsp;|&nbsp;
            ✉&nbsp;<a href="mailto:support@agentbazar.in" style="color:#1a3a6b;text-decoration:none;">support@agentbazar.in</a>
            &nbsp;|&nbsp;
            🌐&nbsp;<a href="https://agentbazar.in" style="color:#1a3a6b;text-decoration:none;">www.agentbazar.in</a>
          </td></tr>

          <!-- Address -->
          <tr><td align="center" style="color:#777;font-size:12px;line-height:20px;font-family:Arial,Helvetica,sans-serif;padding-bottom:12px;">Tripforu Holidays Pvt Ltd &bull; Guwahati, Assam, India</td></tr>

          <!-- Copyright -->
          <tr><td align="center" style="border-top:1px solid #e8eef5;padding-top:12px;font-size:11px;color:#999;font-family:Arial,Helvetica,sans-serif;">&copy; 2026 Agent Bazar. All Rights Reserved.</td></tr>

          <!-- Unsubscribe -->
          <tr><td align="center" style="padding-top:8px;padding-bottom:4px;font-size:11px;font-family:Arial,Helvetica,sans-serif;">
            <a href="${unsubUrl}" style="color:#999;text-decoration:underline;">Unsubscribe from AgentBazar</a>
          </td></tr>

        </table>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`
}

function buildDefaultHtml(params: BuildParams): string {
  const { recipientName, recipientEmail, post, ctaUrl, unsubBaseUrl, clientId, senderFromName } = params
  const coverUrl = post.cover_image_url ?? post.cover_image ?? ""
  const unsubUrl = buildUnsubLink(unsubBaseUrl, recipientEmail, clientId)

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:600px;">
      <!-- Header -->
      <tr><td style="background:#003434;padding:16px 24px;">
        <p style="color:#fff;font-size:14px;font-weight:600;margin:0;">${senderFromName}</p>
      </td></tr>
      <!-- Hero image -->
      ${coverUrl ? `<tr><td><a href="${ctaUrl}" style="display:block;"><img src="${coverUrl}" alt="" width="600" style="display:block;width:100%;max-height:320px;object-fit:cover;" /></a></td></tr>` : ""}
      <!-- Content -->
      <tr><td style="padding:24px;">
        <p style="font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">${post.category ?? ""}</p>
        <a href="${ctaUrl}" style="text-decoration:none;"><h2 style="font-size:22px;font-weight:700;color:#111;line-height:1.3;margin:0 0 12px;">${post.title}</h2></a>
        ${post.excerpt ? `<a href="${ctaUrl}" style="text-decoration:none;"><p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 20px;">${post.excerpt}</p></a>` : ""}
        <a href="${ctaUrl}" style="display:inline-block;background:#003434;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">Read the full article →</a>
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:16px 24px;border-top:1px solid #eee;text-align:center;">
        <p style="font-size:12px;color:#999;margin:0">
          You received this because you subscribed.&nbsp;
          <a href="${unsubUrl}" style="color:#666;text-decoration:underline;">Unsubscribe</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

export function buildNewsletterHtml(params: BuildParams): string {
  if (params.newsletterTemplateHtml) {
    let html = substituteTemplateVars(params.newsletterTemplateHtml, params)
    // Inject unsubscribe footer if template doesn't already include it
    const unsubUrl = buildUnsubLink(params.unsubBaseUrl, params.recipientEmail, params.clientId)
    if (!html.includes("unsubscribe") && !html.includes("Unsubscribe")) {
      html += `<br/><br/><div style="text-align:center;font-size:11px;color:#999;"><a href="${unsubUrl}" style="color:#999;">Unsubscribe</a></div>`
    }
    return html
  }

  if (params.isAgentBazar) {
    return buildAgentBazarDefaultHtml(params)
  }

  return buildDefaultHtml(params)
}
