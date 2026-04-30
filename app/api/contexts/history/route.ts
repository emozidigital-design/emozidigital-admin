import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const client_id = searchParams.get('client_id')

  if (!client_id) {
    return NextResponse.json({ history: [], error: 'client_id required' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('context_pack_history')
      .select('id, generated_at')
      .eq('client_id', client_id)
      .order('generated_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return NextResponse.json({ history: data ?? [] })
  } catch (e) {
    // Table may not exist yet — return empty gracefully
    return NextResponse.json({ history: [], warning: String(e) })
  }
}
