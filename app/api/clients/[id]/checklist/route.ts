import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('checklists')
      .select('item_key, completed, completed_at, completed_by')
      .eq('client_id', params.id)

    if (error) throw error
    return NextResponse.json({ items: data ?? [] })
  } catch (e) {
    return NextResponse.json({ items: [], error: String(e) }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { item_key, completed, completed_by } = await req.json() as {
      item_key: string
      completed: boolean
      completed_by?: string
    }

    if (!item_key) {
      return NextResponse.json({ error: 'item_key required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('checklists')
      .upsert(
        {
          client_id:    params.id,
          item_key,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? (completed_by ?? null) : null,
        },
        { onConflict: 'client_id,item_key' }
      )

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
