import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const N8N_BASE = process.env.N8N_WEBHOOK_BASE ?? 'https://emozi-n8n.onrender.com/webhook'

export async function POST(req: NextRequest) {
  try {
    const { post_id } = await req.json() as { post_id?: string }
    if (!post_id) {
      return NextResponse.json({ error: 'post_id is required' }, { status: 400 })
    }

    // Fetch the full post so n8n has all context
    const { data: post, error: fetchErr } = await supabase
      .from('content_calendar')
      .select('*, clients(legal_name, section_a, section_c, section_g)')
      .eq('id', post_id)
      .single()

    if (fetchErr || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Forward to n8n
    const webhookUrl = `${N8N_BASE}/reevaluate`
    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post_id,
        title:           post.title,
        caption:         post.caption,
        platforms:       post.platforms,
        client_feedback: post.client_feedback,
        revision_count:  post.revision_count ?? 0,
        client_name:     post.clients?.legal_name,
        client_context: {
          section_a: post.clients?.section_a,
          section_c: post.clients?.section_c,
          section_g: post.clients?.section_g,
        },
        timestamp: new Date().toISOString(),
      }),
    })

    if (!n8nRes.ok) {
      const errText = await n8nRes.text()
      return NextResponse.json(
        { error: `n8n webhook failed (${n8nRes.status}): ${errText}` },
        { status: 502 }
      )
    }

    // n8n may return a new caption
    const json = await n8nRes.json().catch(() => ({}))
    return NextResponse.json({ success: true, caption: json.caption ?? null })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
