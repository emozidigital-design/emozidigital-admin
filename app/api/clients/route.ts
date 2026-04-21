import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapClient(row: any) {
  const m = row.section_m ?? {}
  return {
    id:        row.id,
    name:      row.legal_name ?? row.email ?? '',
    email:     row.email ?? '',
    phone:     row.section_a?.phone ?? row.section_b?.phone ?? '',
    package:   m.package   ?? '',
    tier:      m.tier      ?? '',
    status:    row.status  ?? '',
    startDate: m.contract_start ?? row.created_at?.split('T')[0] ?? null,
    mrr:       m.monthly_value != null ? Number(m.monthly_value) : null,
    payment:   m.payment_status ?? '',
    risk:      m.risk_profile   ?? '',
    createdAt: row.created_at   ?? '',
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('id, email, legal_name, status, current_step, created_at, section_a, section_b, section_m')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ clients: (data ?? []).map(mapClient) })
  } catch (e) {
    return NextResponse.json({ clients: [], error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, package: pkg, assigned_am } = await req.json() as {
      name?: string; email?: string; phone?: string; package?: string; assigned_am?: string
    }
    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    const section_a: Record<string, string> = {}
    if (name)  section_a.legal_name = name
    if (phone) section_a.phone      = phone

    const section_m: Record<string, string> = {}
    if (pkg)         section_m.package     = pkg
    if (assigned_am) section_m.assigned_am = assigned_am

    const { data, error } = await supabase.from('clients').insert({
      email,
      legal_name: name ?? email,
      status:     'pending',
      section_a:  Object.keys(section_a).length ? section_a : null,
      section_m:  Object.keys(section_m).length ? section_m : null,
    }).select('id').single()

    if (error) throw error
    return NextResponse.json({ success: true, clientId: data.id })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
