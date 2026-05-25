import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { getAgentBazarSupabase } from "@/lib/supabase-agentbazar"
import { requireAuth } from "@/lib/require-auth"
import { filterEligibleContacts } from "@/lib/email-contacts"

const AGENTBAZAR_CLIENT_ID = "d5104fcd-defe-4e3d-a4cf-1893dba7b931"
const AGENTBAZAR_BLOG_URL = "https://blog.agentbazar.in"

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()
  const { blog_post_id, sender_id, subject, client_id, recipient_type, newsletter_template_id } = body
  const trending_post_ids: string[] = Array.isArray(body.trending_post_ids) ? body.trending_post_ids.slice(0, 2) : []
  const tag_ids: string[] = Array.isArray(body.tag_ids) ? body.tag_ids : []
  const test_email: string | null = typeof body.test_email === "string" && body.test_email ? body.test_email : null

  if (!blog_post_id || !sender_id || !subject || !recipient_type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const isAgentBazar = client_id === AGENTBAZAR_CLIENT_ID

  // ── Fetch blog post ──────────────────────────────────────────────────────────
  let post: {
    id: string; title: string; slug: string
    category: string | null; excerpt: string | null
    cover_image_url?: string | null; cover_image?: string | null
  } | null = null

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

  // ── Fetch trending posts (AgentBazar only) ───────────────────────────────────
  type TrendingPost = { id: string; title: string; slug: string; cover_image: string | null; excerpt: string | null }
  let trendingPosts: TrendingPost[] = []
  if (isAgentBazar && trending_post_ids.length > 0) {
    const { data } = await getAgentBazarSupabase()
      .from("blog_posts")
      .select("id, title, slug, cover_image, excerpt")
      .in("id", trending_post_ids)
    trendingPosts = data ?? []
    trendingPosts.sort((a, b) => trending_post_ids.indexOf(a.id) - trending_post_ids.indexOf(b.id))
  }

  // ── Fetch sender ─────────────────────────────────────────────────────────────
  const { data: sender, error: senderErr } = await supabaseAdmin
    .from("email_senders")
    .select("from_name, from_email")
    .eq("id", sender_id)
    .single()
  if (senderErr || !sender) return NextResponse.json({ error: "Sender not found" }, { status: 404 })

  // ── Fetch newsletter template HTML ───────────────────────────────────────────
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

  // ── Resolve recipients ───────────────────────────────────────────────────────
  type Recipient = { email: string; name: string | null }
  let recipients: Recipient[] = []

  if (recipient_type === "leads") {
    let query = supabaseAdmin.from("lead_list").select("email, name").not("email", "is", null)
    if (client_id) query = query.eq("client_id", client_id)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    recipients = (data ?? []).filter(r => r.email)
  } else {
    if (tag_ids.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("email_contact_tags")
        .select("email_contacts(id, email, name, subscribed, bounced, complained)")
        .in("tag_id", tag_ids)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      recipients = filterEligibleContacts(data ?? []).map(({ email, name }) => ({ email, name }))
    }
  }

  // Test mode overrides recipients
  if (test_email) {
    recipients = [{ email: test_email, name: "Admin (Test)" }]
  } else if (recipients.length === 0) {
    return NextResponse.json({ error: "No eligible recipients found" }, { status: 400 })
  }

  // ── Create newsletter_sends record ───────────────────────────────────────────
  const { data: record, error: recErr } = await supabaseAdmin
    .from("newsletter_sends")
    .insert({
      client_id: client_id || null,
      blog_post_id,
      sender_id,
      subject,
      recipient_type,
      tag_ids,
      trending_post_ids,
      newsletter_template_id: newsletter_template_id || null,
      status: test_email ? "test" : "sending",
      recipient_count: recipients.length,
    })
    .select("id")
    .single()

  if (recErr || !record) {
    return NextResponse.json({ error: "Failed to create newsletter record" }, { status: 500 })
  }

  const blogBaseUrl = isAgentBazar ? AGENTBAZAR_BLOG_URL : (process.env.BLOG_BASE_URL ?? "https://emozidigital.com/blog")
  const ctaUrl = `${blogBaseUrl}/${post!.slug}`

  // ── Fire Edge Function asynchronously — do not await ─────────────────────────
  const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/newsletter-send`
  const internalSecret = process.env.INTERNAL_SECRET!

  // Fire and forget — response is returned to the browser immediately
  fetch(edgeFnUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": internalSecret,
    },
    body: JSON.stringify({
      newsletter_send_id: record.id,
      recipients,
      sender,
      subject,
      post,
      trendingPosts,
      isAgentBazar,
      client_id: client_id || null,
      newsletterTemplateHtml,
      ctaUrl,
      unsubBaseUrl: process.env.NEXTAUTH_URL,
    }),
  }).catch(err => {
    console.error("[newsletter] Edge function invocation failed:", err)
    // Mark as failed so the UI doesn't show "sending" forever
    supabaseAdmin
      .from("newsletter_sends")
      .update({ status: "failed" })
      .eq("id", record.id)
  })

  return NextResponse.json({
    queued: true,
    id: record.id,
    total: recipients.length,
  })
}
