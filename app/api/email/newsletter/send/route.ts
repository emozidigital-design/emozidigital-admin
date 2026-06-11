import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { getAgentBazarSupabase } from "@/lib/supabase-agentbazar"
import { requireAuth } from "@/lib/require-auth"
import { filterEligibleContacts } from "@/lib/email-contacts"
import { sesClient, SES_CONFIGURATION_SET } from "@/lib/ses"
import { SendEmailCommand } from "@aws-sdk/client-ses"
import { buildNewsletterHtml } from "@/lib/newsletter-html"

export const maxDuration = 300

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
  type Recipient = { email: string; name: string | null; user_name: string | null }
  let recipients: Recipient[] = []

  if (recipient_type === "leads") {
    let query = supabaseAdmin.from("lead_list").select("email, name").not("email", "is", null)
    if (client_id) query = query.eq("client_id", client_id)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    recipients = (data ?? []).filter(r => r.email).map((r: any) => ({ email: r.email, name: r.name, user_name: null }))
  } else if (recipient_type === "list") {
    // "All Contacts" — fetch all subscribed contacts for this client, scoped to tag_ids if provided
    if (tag_ids.length > 0) {
      // Tags were selected: only contacts in those tags
      const PAGE = 1000
      let page = 0
      let allRows: Array<{ email_contacts: unknown }> = []
      while (true) {
        const { data, error } = await supabaseAdmin
          .from("email_contact_tags")
          .select("email_contacts(id, email, name, user_name, subscribed, bounced, complained)")
          .in("tag_id", tag_ids)
          .range(page * PAGE, (page + 1) * PAGE - 1)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        if (!data || data.length === 0) break
        allRows = allRows.concat(data)
        if (data.length < PAGE) break
        page++
      }
      recipients = filterEligibleContacts(allRows).map(({ email, name, user_name }) => ({ email, name, user_name: user_name ?? null }))
    } else {
      // No tags selected: fall back to all subscribed contacts for this client
      const PAGE = 1000
      let page = 0
      while (true) {
        let query = supabaseAdmin
          .from("email_contacts")
          .select("email, name, user_name")
          .eq("subscribed", true)
          .eq("bounced", false)
          .eq("complained", false)
          .range(page * PAGE, (page + 1) * PAGE - 1)
        if (client_id) query = (query as any).eq("client_id", client_id)
        const { data, error } = await query
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        if (!data || data.length === 0) break
        recipients = recipients.concat(data.map((c: any) => ({ email: c.email, name: c.name, user_name: c.user_name ?? null })))
        if (data.length < PAGE) break
        page++
      }
    }
  } else {
    if (tag_ids.length > 0) {
      const PAGE = 1000
      let page = 0
      let allRows: Array<{ email_contacts: unknown }> = []
      while (true) {
        const { data, error } = await supabaseAdmin
          .from("email_contact_tags")
          .select("email_contacts(id, email, name, user_name, subscribed, bounced, complained)")
          .in("tag_id", tag_ids)
          .range(page * PAGE, (page + 1) * PAGE - 1)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        if (!data || data.length === 0) break
        allRows = allRows.concat(data)
        if (data.length < PAGE) break
        page++
      }
      recipients = filterEligibleContacts(allRows).map(({ email, name, user_name }) => ({ email, name, user_name: user_name ?? null }))
    }
  }

  const unsubBaseUrl = process.env.NEXTAUTH_URL
  if (!unsubBaseUrl) {
    return NextResponse.json({ error: "NEXTAUTH_URL is not configured" }, { status: 500 })
  }

  // Test mode overrides recipients
  if (test_email) {
    recipients = [{ email: test_email, name: "Admin (Test)", user_name: null }]
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
      sent_count: 0,
      failed_count: 0,
    })
    .select("id")
    .single()

  if (recErr || !record) {
    return NextResponse.json({ error: "Failed to create newsletter record" }, { status: 500 })
  }

  const blogBaseUrl = isAgentBazar ? AGENTBAZAR_BLOG_URL : (process.env.BLOG_BASE_URL ?? "https://emozidigital.com/blog")
  const ctaUrl = `${blogBaseUrl}/${post.slug}`

  // ── Send emails via SES in batches ───────────────────────────────────────────
  const BATCH = 10
  let sent = 0
  let failed = 0

  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH)
    const results = await Promise.allSettled(batch.map(async (contact) => {
      const html = buildNewsletterHtml({
        recipientName: contact.name,
        recipientEmail: contact.email,
        recipientUserId: contact.user_name,
        post,
        trendingPosts,
        ctaUrl,
        unsubBaseUrl,
        isAgentBazar,
        newsletterTemplateHtml,
        clientId: client_id || null,
        senderFromName: sender.from_name,
      })

      const cmd = new SendEmailCommand({
        Source: `${sender.from_name} <${sender.from_email}>`,
        Destination: { ToAddresses: [contact.email] },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: { Html: { Data: html, Charset: "UTF-8" } },
        },
        ConfigurationSetName: SES_CONFIGURATION_SET,
      })

      const res = await sesClient.send(cmd)
      return res.MessageId ?? null
    }))

    // Insert email_sends rows for open/click tracking via SES webhook
    const rows = results.map((r) => ({
      newsletter_send_id: record.id,
      contact_id: null, // newsletter recipients may not be in email_contacts
      ses_message_id: r.status === "fulfilled" ? r.value : null,
      status: r.status === "fulfilled" ? "sent" : "failed",
      ...(r.status === "fulfilled" ? { sent_at: new Date().toISOString() } : {}),
    }))
    await supabaseAdmin.from("email_sends").insert(rows)

    const batchSent = rows.filter(r => r.status === "sent").length
    sent += batchSent
    failed += rows.length - batchSent

    const batchIndex = i / BATCH
    const isLastBatch = i + BATCH >= recipients.length
    if (!isLastBatch && batchIndex % 5 === 4) {
      await supabaseAdmin
        .from("newsletter_sends")
        .update({ sent_count: sent, failed_count: failed })
        .eq("id", record.id)
    }
  }

  // ── Mark newsletter_sends as sent with final counts ──────────────────────────
  await supabaseAdmin
    .from("newsletter_sends")
    .update({
      status: test_email ? "test" : "sent",
      sent_at: new Date().toISOString(),
      sent_count: sent,
      failed_count: failed,
    })
    .eq("id", record.id)

  return NextResponse.json({
    sent,
    failed,
    id: record.id,
    total: recipients.length,
  })
}
