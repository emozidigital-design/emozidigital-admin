import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [
      { count: totalClients },
      { count: activeOnboardings },
      { data: revenueRows },
      { count: pendingPayments },
    ] = await Promise.all([
      // Total clients
      supabase.from('clients').select('*', { count: 'exact', head: true }),

      // Active onboardings (status = 'in_progress')
      supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress'),

      // Monthly revenue: sum section_m->monthly_value where status = 'active'
      supabase
        .from('clients')
        .select('section_m')
        .eq('status', 'active'),

      // Pending payments
      supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'in_progress', 'pending'])
        .filter('section_m->>payment_status', 'in', '("Pending","Overdue")'),
    ])

    const monthlyRevenue = (revenueRows ?? []).reduce((sum, row) => {
      const val = row.section_m?.monthly_value
      return sum + (val != null ? Number(val) : 0)
    }, 0)

    return NextResponse.json({
      totalClients:     totalClients ?? 0,
      activeOnboardings: activeOnboardings ?? 0,
      monthlyRevenue,
      pendingPayments:  pendingPayments ?? 0,
    })
  } catch {
    return NextResponse.json({
      totalClients: 0,
      activeOnboardings: 0,
      monthlyRevenue: 0,
      pendingPayments: 0,
    })
  }
}
