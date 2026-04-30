import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const N8N_BASE = process.env.N8N_WEBHOOK_BASE ?? 'https://emozi-n8n.onrender.com/webhook'

// Map workflow IDs to their n8n webhook paths
const WEBHOOK_MAP: Record<string, string> = {
  a1: 'new-lead',
  a2: 'onboarding-reminder',
  a3: 'monthly-report',
  a4: 'overdue-payment',
  a5: 'content-approval',
  a6: 'onboarding-complete',
  'content-gen':   'content-gen',
  'context-gen':   'context-gen',
  'reevaluate':    'reevaluate',
}

export async function POST(req: NextRequest) {
  try {
    const { workflow_id, client_id, test_mode } = await req.json() as {
      workflow_id: string
      client_id?: string
      test_mode?: boolean
    }

    const webhookPath = WEBHOOK_MAP[workflow_id]
    if (!webhookPath) {
      return NextResponse.json({ error: `Unknown workflow: ${workflow_id}` }, { status: 400 })
    }

    // Fetch client data if provided
    let clientData: Record<string, unknown> = {}
    if (client_id && client_id !== 'test') {
      const { data: client } = await supabase
        .from('clients')
        .select('id, legal_name, email, status, section_a, section_m')
        .eq('id', client_id)
        .single()
      if (client) clientData = client
    } else if (test_mode || client_id === 'test') {
      // Find "Test Business" client or use dummy data
      const { data: testClient } = await supabase
        .from('clients')
        .select('id, legal_name, email, status')
        .ilike('legal_name', '%test%')
        .limit(1)
        .single()

      clientData = testClient ?? {
        id: 'test-000',
        legal_name: 'Test Business',
        email: 'test@emozidigital.com',
        status: 'active',
        _test_mode: true,
      }
    }

    const payload = {
      workflow_id,
      test_mode: test_mode ?? false,
      triggered_by: 'admin_manual',
      triggered_at: new Date().toISOString(),
      client: clientData,
    }

    const webhookUrl = `${N8N_BASE}/${webhookPath}`
    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const execution_id = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    if (!n8nRes.ok) {
      const errText = await n8nRes.text()
      return NextResponse.json({
        success: false,
        execution_id,
        error: `n8n returned ${n8nRes.status}: ${errText}`,
      }, { status: 502 })
    }

    const responseJson = await n8nRes.json().catch(() => ({}))

    return NextResponse.json({
      success: true,
      execution_id: responseJson.executionId ?? execution_id,
      webhook_url: webhookUrl,
      test_mode: test_mode ?? false,
    })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
