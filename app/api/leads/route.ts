import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const minCount = searchParams.get('min_count')

    let query = supabaseAdmin
      .from('lead_list')
      .select('*')
      .order('created_at', { ascending: false })

    if (clientId) query = query.eq('client_id', clientId)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)
    if (minCount) query = query.gte('submission_count', parseInt(minCount))

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Join with clients table to get registered client name
    const uuidClientIds = Array.from(new Set(
      (data ?? []).map((l: { client_id: string | null }) => l.client_id).filter((id: string | null): id is string => !!id && id.includes('-'))
    ))
    let clientMap: Record<string, string> = {}
    if (uuidClientIds.length > 0) {
      const { data: clients } = await supabaseAdmin
        .from('clients')
        .select('id, legal_name')
        .in('id', uuidClientIds)
      clientMap = Object.fromEntries((clients ?? []).map((c: { id: string; legal_name: string | null }) => [c.id, c.legal_name ?? c.id]))
    }

    const enrichedLeads = (data ?? []).map((l: { client_id: string | null; client_name: string | null }) => ({
      ...l,
      display_client_name: (l.client_id && clientMap[l.client_id]) ? clientMap[l.client_id] : (l.client_name ?? null),
    }))

    return NextResponse.json({ success: true, leads: enrichedLeads })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, client_id, client_name, source } = body

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ success: false, error: 'Name and email are required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const { data: existing } = await supabaseAdmin
      .from('lead_list')
      .select('id, submission_count')
      .eq('email', normalizedEmail)
      .eq('client_id', client_id ?? '')
      .single()

    if (existing) {
      const { error } = await supabaseAdmin
        .from('lead_list')
        .update({ submission_count: existing.submission_count + 1, last_submitted_at: new Date().toISOString(), name: name.trim() })
        .eq('id', existing.id)

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    } else {
      const { error } = await supabaseAdmin
        .from('lead_list')
        .insert([{ name: name.trim(), email: normalizedEmail, client_id, client_name, source }])

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
