import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const COLUMNS = ['Pending', 'In Progress', 'Submitted', 'Completed', 'Blocked'] as const

// Map DB status values to Kanban column labels
const STATUS_MAP: Record<string, string> = {
  pending:     'Pending',
  in_progress: 'In Progress',
  submitted:   'Submitted',
  completed:   'Completed',
  blocked:     'Blocked',
}

function daysSince(dateStr?: string | null): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('id, legal_name, email, status, created_at, section_m')
      .order('created_at', { ascending: false })

    if (error) throw error

    const pipeline: Record<string, unknown[]> = Object.fromEntries(
      COLUMNS.map((c) => [c, []])
    )

    for (const row of data ?? []) {
      const col = STATUS_MAP[row.status ?? ''] ?? 'Pending'
      pipeline[col].push({
        id:         row.id,
        clientName: row.legal_name || row.email || 'Unnamed',
        package:    row.section_m?.package ?? '',
        daysSince:  daysSince(row.created_at),
      })
    }

    return NextResponse.json({ pipeline })
  } catch {
    return NextResponse.json({
      pipeline: Object.fromEntries(COLUMNS.map((c) => [c, []])),
    })
  }
}
