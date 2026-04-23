import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const monthStart = searchParams.get('start')
    const monthEnd = searchParams.get('end')
    const clientId = searchParams.get('clientId')

    let query = supabase
      .from('content_calendar')
      .select('*, clients(legal_name)')

    if (monthStart && monthEnd) {
      query = query.gte('scheduled_date', monthStart).lte('scheduled_date', monthEnd)
    }

    if (clientId && clientId !== 'all') {
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query.order('scheduled_date', { ascending: false })

    if (error) throw error
    return NextResponse.json({ entries: data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...payload } = body

    const { data, error } = await supabase
      .from('content_calendar')
      .upsert({
        ...(id ? { id } : {}),
        ...payload,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, entry: data })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { error } = await supabase
      .from('content_calendar')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
