import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE ?? 'https://emozi-n8n.onrender.com/webhook'

export async function POST(req: NextRequest) {
  try {
    const { client_id } = await req.json() as { client_id?: string }
    if (!client_id) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
    }

    // Fetch client record
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single()

    if (fetchError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Call n8n webhook
    const webhookUrl = `${N8N_WEBHOOK_BASE}/content-gen`
    const n8nPayload = {
      client_id,
      client_name: client.legal_name ?? client.email,
      platforms_enabled: client.platforms_enabled ?? [],
      posts_per_week: client.posts_per_week ?? {},
      content_mix: client.content_mix ?? {},
      reeval_mode: client.reeval_mode ?? 'Auto Mode',
      timestamp: new Date().toISOString(),
    }

    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(n8nPayload),
    })

    if (!n8nRes.ok) {
      const errText = await n8nRes.text()
      return NextResponse.json(
        { error: `n8n webhook failed: ${errText}` },
        { status: 502 }
      )
    }

    // Log the generation attempt
    const now = new Date().toISOString()
    try {
      await supabase.from('content_generation_logs').insert({
        client_id,
        generated_at: now,
        status: 'success',
        platforms: client.platforms_enabled ?? [],
      })
    } catch { /* table may not exist yet — non-blocking */ }

    return NextResponse.json({ success: true, generated_at: now })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
