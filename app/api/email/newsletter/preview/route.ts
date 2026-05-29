import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { getAgentBazarSupabase } from "@/lib/supabase-agentbazar"
import { requireAuth } from "@/lib/require-auth"
import { buildNewsletterHtml } from "@/lib/newsletter-html"

const AGENTBAZAR_CLIENT_ID = "d5104fcd-defe-4e3d-a4cf-1893dba7b931"
const AGENTBAZAR_BLOG_URL  = "https://blog.agentbazar.in"

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()
  const { blog_post_id, sender_id, client_id, newsletter_template_id } = body
  const trending_post_ids: string[] = Array.isArray(body.trending_post_ids) ? body.trending_post_ids.slice(0, 2) : []

  const isAgentBazar = client_id === AGENTBAZAR_CLIENT_ID

  // Fetch blog post
  let post: { id: string; title: string; slug: string; category: string | null; excerpt: string | null; cover_image_url?: string | null; cover_image?: string | null } | null = null
  if (isAgentBazar) {
    const { data } = await getAgentBazarSupabase().from("blog_posts").select("id, title, slug, category, excerpt, cover_image").eq("id", blog_post_id).single()
    if (data) post = { ...data, cover_image_url: data.cover_image }
  } else {
    const { data } = await supabaseAdmin.from("blog_posts").select("id, title, slug, category, excerpt, cover_image_url").eq("id", blog_post_id).single()
    if (data) post = data
  }
  if (!post) return NextResponse.json({ error: "post not found" }, { status: 404 })

  // Fetch trending posts
  type TrendingPost = { id: string; title: string; slug: string; cover_image: string | null; excerpt: string | null }
  let trendingPosts: TrendingPost[] = []
  if (isAgentBazar && trending_post_ids.length > 0) {
    const { data } = await getAgentBazarSupabase().from("blog_posts").select("id, title, slug, cover_image, excerpt").in("id", trending_post_ids)
    trendingPosts = data ?? []
    trendingPosts.sort((a, b) => trending_post_ids.indexOf(a.id) - trending_post_ids.indexOf(b.id))
  }

  // Fetch sender
  const { data: sender } = await supabaseAdmin.from("email_senders").select("from_name, from_email").eq("id", sender_id).single()

  // Fetch template
  let newsletterTemplateHtml: string | null = null
  if (newsletter_template_id) {
    const { data: tmpl } = await supabaseAdmin.from("email_templates").select("html_body, client_id, template_type").eq("id", newsletter_template_id).eq("template_type", "newsletter").single()
    if (tmpl && tmpl.client_id === (client_id ?? null)) newsletterTemplateHtml = tmpl.html_body
  }

  const blogBaseUrl = isAgentBazar ? AGENTBAZAR_BLOG_URL : (process.env.BLOG_BASE_URL ?? "https://emozidigital.com/blog")
  const ctaUrl = `${blogBaseUrl}/${post.slug}`
  const unsubBaseUrl = process.env.NEXTAUTH_URL ?? "https://admin.emozidigital.com"

  const html = buildNewsletterHtml({
    recipientName: "Preview",
    recipientEmail: "preview@example.com",
    post,
    trendingPosts,
    ctaUrl,
    unsubBaseUrl,
    isAgentBazar,
    newsletterTemplateHtml,
    clientId: client_id || null,
    senderFromName: sender?.from_name ?? "Sender",
  })

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}
