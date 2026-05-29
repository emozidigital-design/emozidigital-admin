import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { getAgentBazarSupabase } from "@/lib/supabase-agentbazar"
import { requireAuth } from "@/lib/require-auth"
import { sesClient, SES_CONFIGURATION_SET } from "@/lib/ses"
import { SendEmailCommand } from "@aws-sdk/client-ses"
import { buildNewsletterHtml } from "@/lib/newsletter-html"

export const maxDuration = 300

const AGENTBAZAR_CLIENT_ID = "d5104fcd-defe-4e3d-a4cf-1893dba7b931"
const AGENTBAZAR_BLOG_URL = "https://blog.agentbazar.in"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = await req.json()
  const { subject: overrideSubject, scheduled_at } = body

  // Fetch original newsletter
  const { data: orig, error: origErr } = await supabaseAdmin
    .from("newsletter_sends")
    .select("*")
    .eq("id", params.id)
    .single()

  if (origErr || !orig) return NextResponse.json({ error: "newsletter not found" }, { status: 404 })

  // Paginate RPC in chunks to bypass PostgREST project-level max_rows cap
  const RPC_PAGE = 1000
  let rpcPage = 0
  const allContacts: Array<{ email: string; name: string | null; opened: boolean }> = []
  while (true) {
    const { data, error: rpcErr } = await supabaseAdmin
      .rpc("get_newsletter_contacts_with_opens", { p_newsletter_send_id: params.id })
      .range(rpcPage * RPC_PAGE, (rpcPage + 1) * RPC_PAGE - 1)
    if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 })
    if (!data || data.length === 0) break
    allContacts.push(...(data as typeof allContacts))
    if (data.length < RPC_PAGE) break
    rpcPage++
  }

  if (allContacts.length === 0) {
    return NextResponse.json({ error: "no sends found for this newsletter" }, { status: 400 })
  }

  const unopenedEmails = allContacts
    .filter(c => !c.opened)
    .map(c => c.email)

  // Fetch contact eligibility for unopened contacts
  const eligibleMap = new Map<string, { id: string; email: string; name: string | null }>()
  for (let i = 0; i < unopenedEmails.length; i += 1000) {
    const { data: contacts } = await supabaseAdmin
      .from("email_contacts")
      .select("id, email, name, subscribed, bounced, complained")
      .in("email", unopenedEmails.slice(i, i + 1000))
      .eq("subscribed", true)
      .eq("bounced", false)
      .eq("complained", false)
    for (const c of contacts ?? []) eligibleMap.set(c.email, c)
  }

  const unopenedRecipients = Array.from(eligibleMap.values())

  if (unopenedRecipients.length === 0) {
    return NextResponse.json({ error: "all recipients have already opened this newsletter" }, { status: 400 })
  }

  const subject = overrideSubject ?? orig.subject
  const isAgentBazar = orig.client_id === AGENTBAZAR_CLIENT_ID

  // Fetch blog post
  let post: { id: string; title: string; slug: string; category: string | null; excerpt: string | null; cover_image_url?: string | null; cover_image?: string | null } | null = null
  if (isAgentBazar) {
    const { data } = await getAgentBazarSupabase().from("blog_posts").select("id, title, slug, category, excerpt, cover_image").eq("id", orig.blog_post_id).single()
    if (data) post = { ...data, cover_image_url: data.cover_image }
  } else {
    const { data } = await supabaseAdmin.from("blog_posts").select("id, title, slug, category, excerpt, cover_image_url").eq("id", orig.blog_post_id).single()
    if (data) post = data
  }
  if (!post) return NextResponse.json({ error: "blog post not found" }, { status: 404 })

  // Fetch trending posts (AgentBazar only)
  type TrendingPost = { id: string; title: string; slug: string; cover_image: string | null; excerpt: string | null }
  let trendingPosts: TrendingPost[] = []
  if (isAgentBazar && (orig.trending_post_ids ?? []).length > 0) {
    const { data } = await getAgentBazarSupabase().from("blog_posts").select("id, title, slug, cover_image, excerpt").in("id", orig.trending_post_ids)
    trendingPosts = data ?? []
    trendingPosts.sort((a, b) => orig.trending_post_ids.indexOf(a.id) - orig.trending_post_ids.indexOf(b.id))
  }

  // Fetch sender
  const { data: sender, error: senderErr } = await supabaseAdmin.from("email_senders").select("from_name, from_email").eq("id", orig.sender_id).single()
  if (senderErr || !sender) return NextResponse.json({ error: "sender not found" }, { status: 404 })

  // Fetch template HTML
  let newsletterTemplateHtml: string | null = null
  if (orig.newsletter_template_id) {
    const { data: tmpl } = await supabaseAdmin.from("email_templates").select("html_body").eq("id", orig.newsletter_template_id).single()
    if (tmpl) newsletterTemplateHtml = tmpl.html_body
  }

  const unsubBaseUrl = process.env.NEXTAUTH_URL
  if (!unsubBaseUrl) {
    return NextResponse.json({ error: "NEXTAUTH_URL is not configured" }, { status: 500 })
  }

  const blogBaseUrl = isAgentBazar ? AGENTBAZAR_BLOG_URL : (process.env.BLOG_BASE_URL ?? "https://emozidigital.com/blog")
  const ctaUrl = `${blogBaseUrl}/${post.slug}`

  // Create new newsletter_sends record
  const { data: newRecord, error: recErr } = await supabaseAdmin
    .from("newsletter_sends")
    .insert({
      client_id: orig.client_id,
      blog_post_id: orig.blog_post_id,
      sender_id: orig.sender_id,
      subject,
      recipient_type: orig.recipient_type,
      tag_ids: orig.tag_ids ?? [],
      trending_post_ids: orig.trending_post_ids ?? [],
      newsletter_template_id: orig.newsletter_template_id,
      status: scheduled_at ? "scheduled" : "sending",
      scheduled_at: scheduled_at ?? null,
      recipient_count: unopenedRecipients.length,
      sent_count: 0,
      failed_count: 0,
      opens_count: 0,
      clicks_count: 0,
    })
    .select("id")
    .single()

  if (recErr || !newRecord) return NextResponse.json({ error: "failed to create resend record" }, { status: 500 })

  if (scheduled_at) {
    return NextResponse.json({ scheduled: true, id: newRecord.id, total: unopenedRecipients.length })
  }

  // ── Send emails via SES in batches ───────────────────────────────────────────
  const BATCH = 10
  let sent = 0
  let failed = 0

  for (let i = 0; i < unopenedRecipients.length; i += BATCH) {
    const batch = unopenedRecipients.slice(i, i + BATCH)
    const results = await Promise.allSettled(batch.map(async (contact) => {
      const html = buildNewsletterHtml({
        recipientName: contact.name,
        recipientEmail: contact.email,
        post,
        trendingPosts,
        ctaUrl,
        unsubBaseUrl,
        isAgentBazar,
        newsletterTemplateHtml,
        clientId: orig.client_id ?? null,
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
    // contact_id is available here because unopenedRecipients come from eligibleMap (email_contacts rows)
    const rows = results.map((r, idx) => ({
      newsletter_send_id: newRecord.id,
      contact_id: batch[idx].id,
      ses_message_id: r.status === "fulfilled" ? r.value : null,
      status: r.status === "fulfilled" ? "sent" : "failed",
      ...(r.status === "fulfilled" ? { sent_at: new Date().toISOString() } : {}),
    }))
    await supabaseAdmin.from("email_sends").insert(rows)

    const batchSent = rows.filter(r => r.status === "sent").length
    sent += batchSent
    failed += rows.length - batchSent

    const batchIndex = i / BATCH
    const isLastBatch = i + BATCH >= unopenedRecipients.length
    if (!isLastBatch && batchIndex % 5 === 4) {
      await supabaseAdmin
        .from("newsletter_sends")
        .update({ sent_count: sent, failed_count: failed })
        .eq("id", newRecord.id)
    }
  }

  // ── Mark newsletter_sends as sent with final counts ──────────────────────────
  await supabaseAdmin
    .from("newsletter_sends")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_count: sent,
      failed_count: failed,
    })
    .eq("id", newRecord.id)

  return NextResponse.json({ sent, failed, id: newRecord.id, total: unopenedRecipients.length })
}
