import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 1. Fetch recent clients
    const { data: clients } = await supabase
      .from('clients')
      .select('id, legal_name, email, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    // 2. Fetch recent automations
    const { data: automations } = await supabase
      .from('automation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    const clientActivities = (clients ?? []).map((row) => ({
      id:     row.id,
      type:   'client' as const,
      label:  row.legal_name || row.email || 'Client',
      action: 'New registration',
      time:   row.created_at,
    }))

    const autoActivities = (automations ?? []).map((row) => ({
      id:     row.id,
      type:   'automation' as const,
      label:  row.scenario.replace(/_/g, ' '),
      action: row.payload?.legal_name || row.payload?.email || 'Executed',
      time:   row.created_at,
    }))

    const activities = [...clientActivities, ...autoActivities]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 20)

    return NextResponse.json({ activities })
  } catch (e) {
    console.error('[activity] Error:', e)
    return NextResponse.json({ activities: [] })
  }
}
