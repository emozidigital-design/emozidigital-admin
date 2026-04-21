import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('id, legal_name, email, status, created_at, updated_at')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(20)

    if (error) {
      // updated_at may not exist — fall back to created_at
      const { data: fallback } = await supabase
        .from('clients')
        .select('id, legal_name, email, status, created_at')
        .order('created_at', { ascending: false })
        .limit(20)

      const activities = (fallback ?? []).map((row) => ({
        id:     row.id,
        type:   'client' as const,
        label:  row.legal_name || row.email || 'Client',
        action: 'record updated',
        time:   row.created_at,
      }))
      return NextResponse.json({ activities })
    }

    const activities = (data ?? []).map((row) => ({
      id:     row.id,
      type:   'client' as const,
      label:  row.legal_name || row.email || 'Client',
      action: row.status ? `status: ${row.status}` : 'record updated',
      time:   row.updated_at ?? row.created_at,
    }))

    return NextResponse.json({ activities })
  } catch {
    return NextResponse.json({ activities: [] })
  }
}
