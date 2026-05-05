import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// JSONB section columns on the clients table
const SECTION_COLS = [
  'section_a', 'section_b', 'section_c', 'section_d',
  'section_e', 'section_f', 'section_g', 'section_h',
  'section_i', 'section_j', 'section_k', 'section_l',
  'section_m', 'section_notes',
] as const

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: row, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', params.id)
      .single<Record<string, unknown>>()

    if (error || !row) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Try content_calendar table (best-effort)
    let contentCalendar: unknown[] = []
    try {
      const { data: cal } = await supabase
        .from('content_calendar')
        .select('*')
        .eq('client_id', params.id)
        .order('scheduled_date', { ascending: true })
        .limit(50)
      contentCalendar = cal ?? []
    } catch { /* table may not exist */ }

    return NextResponse.json({
      client: {
        id:           row.id,
        email:        row.email,
        legal_name:   row.legal_name,
        status:       row.status,
        current_step: row.current_step,
        created_at:   row.created_at,
        section_a:    row.section_a,
        section_b:    row.section_b,
        section_c:    row.section_c,
        section_d:    row.section_d,
        section_e:    row.section_e,
        section_f:    row.section_f,
        section_g:    row.section_g,
        section_h:    row.section_h,
        section_i:    row.section_i,
        section_j:    row.section_j,
        section_k:    row.section_k,
        section_l:    row.section_l,
        section_m:    row.section_m,
        section_notes: row.section_notes,
      },
      contentCalendar,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()

    // New shape: { section: 'section_l', data: {...} }
    if (body.section) {
      const { section, data } = body as { section: string; data: unknown }

      if (!SECTION_COLS.includes(section as (typeof SECTION_COLS)[number])) {
        return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
      }

      // For JSONB sections: merge with existing data to allow partial field updates
      if (section !== 'section_notes') {
        // Fetch current value
        const { data: current } = await supabase
          .from('clients')
          .select(section)
          .eq('id', params.id)
          .single()

        const existing = (current as Record<string, unknown> | null)?.[section] ?? {}
        const merged = typeof data === 'object' && data !== null && !Array.isArray(data)
          ? { ...(existing as object), ...(data as object) }
          : data

        const { error } = await supabase
          .from('clients')
          .update({ [section]: merged })
          .eq('id', params.id)

        if (error) throw error

        if (section === 'section_m' && typeof merged === 'object' && merged !== null) {
          const mergedObj = merged as Record<string, unknown>
          const onboardingWebhook = process.env.N8N_ONBOARDING_WEBHOOK_URL
          if (onboardingWebhook && String(mergedObj.onboarding_status).toLowerCase() === 'completed') {
            try {
              await fetch(onboardingWebhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ record: { id: params.id, status: mergedObj.onboarding_status } })
              })
            } catch (webhookError) {
              console.error("Onboarding webhook failed:", webhookError)
            }
          }
        }
      } else {
        // section_notes is plain text — accept string or { notes: string }
        const notesVal =
          typeof data === 'string'
            ? data
            : (typeof (data as Record<string, unknown>)?.notes === 'string'
                ? (data as Record<string, unknown>).notes
                : String(data ?? ''))
        const { error } = await supabase
          .from('clients')
          .update({ section_notes: notesVal })
          .eq('id', params.id)

        if (error) throw error
      }

      return NextResponse.json({ success: true })
    }

    // Legacy shape: { field, value } — map top-level fields
    const { field, value } = body as { field: string; value: string }
    if (!field || value === undefined) {
      return NextResponse.json({ error: 'field and value are required' }, { status: 400 })
    }

    // Map legacy field names to DB columns
    const TOP_LEVEL: Record<string, string> = {
      status:     'status',
      email:      'email',
      legal_name: 'legal_name',
      'Legal Name': 'legal_name',
      'Email':    'email',
      'Status':   'status',
    }

    const col = TOP_LEVEL[field]
    if (col) {
      const { error } = await supabase
        .from('clients')
        .update({ [col]: value })
        .eq('id', params.id)
      if (error) throw error

      const onboardingWebhook = process.env.N8N_ONBOARDING_WEBHOOK_URL
      if (onboardingWebhook && col === 'status' && String(value).toLowerCase() === 'completed') {
        try {
          await fetch(onboardingWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ record: { id: params.id, status: value } })
          })
        } catch (webhookError) {
          console.error("Onboarding webhook failed:", webhookError)
        }
      }
    }
    // Unknown fields are silently ignored (Notion-era calls)

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

    // 1. Get client_user IDs for this client
    const { data: clientUsers } = await supabase
      .from('client_users')
      .select('id')
      .eq('client_id', id)

    // 2. Delete auth_tokens for those users
    if (clientUsers && clientUsers.length > 0) {
      const userIds = clientUsers.map(u => u.id)
      await supabase.from('auth_tokens').delete().in('user_id', userIds)
    }

    // 3. Delete rows that don't cascade from clients
    await supabase.from('content_calendar').delete().eq('client_id', id)
    await supabase.from('client_users').delete().eq('client_id', id)

    // 4. Delete the client itself
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
