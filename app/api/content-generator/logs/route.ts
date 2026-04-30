import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const client_id = searchParams.get('client_id')
  if (!client_id) {
    return NextResponse.json({ logs: [], error: 'client_id required' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('content_generation_logs')
      .select('id, generated_at, status, posts_generated, errors, platforms')
      .eq('client_id', client_id)
      .order('generated_at', { ascending: false })
      .limit(5)

    if (error) throw error
    return NextResponse.json({ logs: data ?? [] })
  } catch (e) {
    // Table may not exist yet — return empty gracefully
    return NextResponse.json({ logs: [], warning: String(e) })
  }
}
