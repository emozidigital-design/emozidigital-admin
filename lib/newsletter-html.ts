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
    recipientName, recipientEmail, post, trendingPosts,
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

  const trendingHtml = trendingPosts.map(tp => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;">
        ${tp.cover_image ? `<img src="${tp.cover_image}" alt="" width="60" style="float:left;margin-right:10px;border-radius:4px;object-fit:cover;" />` : ""}
        <a href="${blogBase}/${tp.slug}" style="font-size:13px;font-weight:600;color:#001D4A;text-decoration:none;">${tp.title}</a>
        <div style="clear:both;"></div>
      </td>
    </tr>`).join("")

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:600px;">
      <!-- Header -->
      <tr><td style="background:#001D4A;padding:14px 24px;text-align:center;">
        <p style="color:#fff;font-size:13px;font-weight:700;letter-spacing:2px;margin:0;">agentBazar.in</p>
      </td></tr>
      <!-- Greeting -->
      <tr><td style="padding:20px 24px 12px;border-bottom:2px solid #F47920;">
        <p style="font-style:italic;color:#444;margin:0 0 4px;">Hello ${recipientName ?? "there"},</p>
        <p style="font-weight:700;color:#222;font-size:12px;margin:0;">Today's Highlight</p>
      </td></tr>
      <!-- Hero image -->
      ${coverUrl ? `<tr><td><img src="${coverUrl}" alt="" width="600" style="display:block;width:100%;max-height:300px;object-fit:cover;" /></td></tr>` : ""}
      <!-- Hero content -->
      <tr><td style="padding:20px 24px;">
        <p style="color:#F47920;font-weight:700;font-size:18px;line-height:1.4;margin:0 0 10px;">${post.title}</p>
        ${post.excerpt ? `<p style="color:#555;font-size:13px;font-weight:600;line-height:1.6;margin:0 0 16px;">${post.excerpt}</p>` : ""}
        <a href="${ctaUrl}" style="display:inline-block;background:#F47920;color:#fff;font-size:13px;font-weight:700;font-style:italic;padding:10px 24px;border-radius:4px;text-decoration:none;">Read Full Blog...</a>
      </td></tr>
      <!-- Trending -->
      ${trendingHtml ? `<tr><td style="padding:12px 24px;">
        <p style="font-size:12px;font-weight:700;color:#001D4A;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Also Trending</p>
        <table width="100%" cellpadding="0" cellspacing="0">${trendingHtml}</table>
      </td></tr>` : ""}
      <!-- WhatsApp CTA -->
      <tr><td style="background:#1a6b3a;padding:20px 24px;text-align:center;">
        <p style="color:#fff;font-size:12px;margin:0 0 4px;">For the latest Travel Blog &amp; Updates</p>
        <p style="color:#fff;font-weight:700;font-size:14px;margin:0 0 12px;">Join Our WhatsApp Community Now</p>
        <a href="https://wa.me/917002021396" style="display:inline-block;background:#fff;color:#1a6b3a;font-size:12px;font-weight:700;padding:8px 20px;border-radius:20px;text-decoration:none;">▶ JOIN NOW</a>
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:16px 24px;text-align:center;background:#fafafa;border-top:1px solid #eee;">
        <p style="font-size:10px;color:#999;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">agentbazar.in</p>
        <a href="${unsubUrl}" style="font-size:10px;color:#666;text-decoration:underline;">Unsubscribe from AgentBazar</a>
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
      ${coverUrl ? `<tr><td><img src="${coverUrl}" alt="" width="600" style="display:block;width:100%;max-height:320px;object-fit:cover;" /></td></tr>` : ""}
      <!-- Content -->
      <tr><td style="padding:24px;">
        <p style="font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">${post.category ?? ""}</p>
        <h2 style="font-size:22px;font-weight:700;color:#111;line-height:1.3;margin:0 0 12px;">${post.title}</h2>
        ${post.excerpt ? `<p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 20px;">${post.excerpt}</p>` : ""}
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
