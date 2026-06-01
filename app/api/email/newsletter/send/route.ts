import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { getAgentBazarSupabase } from "@/lib/supabase-agentbazar"
import { requireAuth } from "@/lib/require-auth"
import { filterEligibleContacts } from "@/lib/email-contacts"
import { sesClient, SES_CONFIGURATION_SET } from "@/lib/ses"
import { SendEmailCommand } from "@aws-sdk/client-ses"
import { buildNewsletterHtml } from "@/lib/newsletter-html"

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

  // ── Fetch sender ─────────────────────────────────────────────────────────────
  const { data: sender, error: senderErr } = await supabaseAdmin
    .from("email_senders")
    .select("from_name, from_email")
    .eq("id", sender_id)
    .single()
  if (senderErr || !sender) return NextResponse.json({ error: "Sender not found" }, { status: 404 })

  // ── Resolve recipients (needed for recipient_count on the DB record) ──────────
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
      const PAGE = 1000
      let page = 0
      let allRows: Array<{ email_contacts: unknown }> = []
      while (true) {
        const { data, error } = await supabaseAdmin
          .from("email_contact_tags")
          .select("email_contacts(id, email, name, subscribed, bounced, complained)")
          .in("tag_id", tag_ids)
          .range(page * PAGE, (page + 1) * PAGE - 1)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        if (!data || data.length === 0) break
        allRows = allRows.concat(data)
        if (data.length < PAGE) break
        page++
      }
      recipients = filterEligibleContacts(allRows).map(({ email, name }) => ({ email, name }))
    }
  }

  const unsubBaseUrl = process.env.NEXTAUTH_URL
  if (!unsubBaseUrl) {
    return NextResponse.json({ error: "NEXTAUTH_URL is not configured" }, { status: 500 })
  }

  // Test mode: send synchronously here (small list, no timeout risk)
  if (test_email) {
    const testRecipients: Recipient[] = [{ email: test_email, name: "Admin (Test)" }]
    const { data: record, error: recErr } = await supabaseAdmin
      .from("newsletter_sends")
      .insert({
        client_id: client_id || null,
        blog_post_id, sender_id, subject, recipient_type, tag_ids, trending_post_ids,
        newsletter_template_id: newsletter_template_id || null,
        status: "test", recipient_count: 1, sent_count: 0, failed_count: 0,
      })
      .select("id")
      .single()
    if (recErr || !record) return NextResponse.json({ error: "Failed to create test record" }, { status: 500 })

    const trendingPosts: Array<{ id: string; title: string; slug: string; cover_image: string | null; excerpt: string | null }> = []
    const blogBaseUrl = isAgentBazar ? AGENTBAZAR_BLOG_URL : (process.env.BLOG_BASE_URL ?? "https://emozidigital.com/blog")
    const ctaUrl = `${blogBaseUrl}/${post.slug}`
    let newsletterTemplateHtml: string | null = null
    if (newsletter_template_id) {
      const { data: tmpl } = await supabaseAdmin.from("email_templates").select("html_body, client_id, template_type").eq("id", newsletter_template_id).eq("template_type", "newsletter").single()
      if (tmpl && tmpl.client_id === (client_id ?? null)) newsletterTemplateHtml = tmpl.html_body
    }

    const html = buildNewsletterHtml({ recipientName: testRecipients[0].name, recipientEmail: testRecipients[0].email, post, trendingPosts, ctaUrl, unsubBaseUrl, isAgentBazar, newsletterTemplateHtml, clientId: client_id || null, senderFromName: sender.from_name })
    const cmd = new SendEmailCommand({
      Source: `${sender.from_name} <${sender.from_email}>`,
      Destination: { ToAddresses: [test_email] },
      Message: { Subject: { Data: subject, Charset: "UTF-8" }, Body: { Html: { Data: html, Charset: "UTF-8" } } },
      ConfigurationSetName: SES_CONFIGURATION_SET,
    })
    try {
      const res = await sesClient.send(cmd)
      await supabaseAdmin.from("email_sends").insert([{ newsletter_send_id: record.id, contact_id: null, ses_message_id: res.MessageId ?? null, status: "sent", sent_at: new Date().toISOString() }])
      await supabaseAdmin.from("newsletter_sends").update({ status: "test", sent_count: 1 }).eq("id", record.id)
      return NextResponse.json({ sent: 1, failed: 0, id: record.id, total: 1 })
    } catch {
      await supabaseAdmin.from("newsletter_sends").update({ status: "test", failed_count: 1 }).eq("id", record.id)
      return NextResponse.json({ error: "Test send failed" }, { status: 500 })
    }
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No eligible recipients found" }, { status: 400 })
  }

  // ── Create newsletter_sends record then hand off to VPS ───────────────────────
  const { data: record, error: recErr } = await supabaseAdmin
    .from("newsletter_sends")
    .insert({
      client_id: client_id || null,
      blog_post_id, sender_id, subject, recipient_type, tag_ids, trending_post_ids,
      newsletter_template_id: newsletter_template_id || null,
      status: "sending",
      recipient_count: recipients.length,
      sent_count: 0,
      failed_count: 0,
    })
    .select("id")
    .single()

  if (recErr || !record) {
    return NextResponse.json({ error: "Failed to create newsletter record" }, { status: 500 })
  }

  const vpsUrl = process.env.VPS_SENDER_URL
  const secret = process.env.INTERNAL_SECRET
  if (!vpsUrl || !secret) {
    return NextResponse.json({ error: "VPS_SENDER_URL or INTERNAL_SECRET not configured" }, { status: 500 })
  }

  const vpsRes = await fetch(`${vpsUrl}/send-newsletter`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": secret },
    body: JSON.stringify({
      newsletter_send_id: record.id,
      blog_post_id, sender_id, subject, client_id, recipient_type,
      newsletter_template_id: newsletter_template_id || null,
      trending_post_ids, tag_ids,
    }),
  })

  if (!vpsRes.ok) {
    const text = await vpsRes.text()
    await supabaseAdmin.from("newsletter_sends").update({ status: "draft" }).eq("id", record.id)
    return NextResponse.json({ error: `VPS error: ${text}` }, { status: 502 })
  }

  return NextResponse.json({ ok: true, message: "Newsletter send started", id: record.id, total: recipients.length })
}
