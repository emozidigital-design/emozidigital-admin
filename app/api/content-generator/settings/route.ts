import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// PATCH — save content generator settings to top-level client columns
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as {
      client_id: string
      platforms_enabled?: string[]
      posts_per_week?: Record<string, number>
      content_mix?: Record<string, number>
      reeval_mode?: string
      content_auto_gen?: boolean
    }

    const { client_id, ...fields } = body
    if (!client_id) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
    }

    const updatePayload: Record<string, unknown> = {}
    if (fields.platforms_enabled !== undefined) updatePayload.platforms_enabled = fields.platforms_enabled
    if (fields.posts_per_week     !== undefined) updatePayload.posts_per_week    = fields.posts_per_week
    if (fields.content_mix        !== undefined) updatePayload.content_mix       = fields.content_mix
    if (fields.reeval_mode        !== undefined) updatePayload.reeval_mode       = fields.reeval_mode
    if (fields.content_auto_gen   !== undefined) updatePayload.content_auto_gen  = fields.content_auto_gen

    const { error } = await supabase
      .from('clients')
      .update(updatePayload)
      .eq('id', client_id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
