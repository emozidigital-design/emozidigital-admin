import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') ?? '20', 10)

    const { data, error } = await supabase
      .from('content_generation_logs')
      .select('*, clients(section_a)')
      .order('generated_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    const logs = (data ?? []).map((row: any) => ({
      ...row,
      business_name: row.clients?.section_a?.business_name ?? null,
    }))

    return NextResponse.json({ logs })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
