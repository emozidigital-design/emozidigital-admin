import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const N8N_CONTEXT_WEBHOOK = 'https://n8n.emozidigital.com/webhook/context-gen'

export async function POST(req: NextRequest) {
  try {
    const { client_id } = await req.json() as { client_id?: string }
    if (!client_id) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
    }

    // Fetch full client record
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single()

    if (fetchError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Call n8n context-gen webhook
    const n8nRes = await fetch(N8N_CONTEXT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id,
        client_name:  client.legal_name ?? client.email,
        section_a:    client.section_a   ?? {},
        section_c:    client.section_c   ?? {},
        section_g:    client.section_g   ?? {},
        section_i:    client.section_i   ?? {},
        generated_at: new Date().toISOString(),
      }),
    })

    if (!n8nRes.ok) {
      const errText = await n8nRes.text()
      return NextResponse.json(
        { error: `n8n webhook failed (${n8nRes.status}): ${errText}` },
        { status: 502 }
      )
    }

    // Persist the timestamp so the tab can show "Generated [date]"
    const now = new Date().toISOString()
    await supabase
      .from('clients')
      .update({ context_pack_generated_at: now })
      .eq('id', client_id)

    // Best-effort: write a history entry
    try {
      await supabase.from('context_pack_history').insert({
        client_id,
        generated_at: now,
        snapshot: {
          section_a: client.section_a,
          section_c: client.section_c,
          section_g: client.section_g,
          section_i: client.section_i,
        },
      })
    } catch { /* table may not exist yet */ }

    return NextResponse.json({ success: true, generated_at: now })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
