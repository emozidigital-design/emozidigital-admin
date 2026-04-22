import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await req.json()
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // 1. Update the content_calendar entry
    const { data: entry, error: updateError } = await supabase
      .from('content_calendar')
      .update({ status })
      .eq('id', params.id)
      .select('*, clients(legal_name, email)')
      .single()

    if (updateError) throw updateError

    // 2. If status is 'review', fire n8n webhook
    if (status === 'review' && process.env.N8N_WEBHOOK_BASE) {
      const client = (entry as any).clients
      
      fetch(process.env.N8N_WEBHOOK_BASE + '/content-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'content_ready_for_review',
          entryId: entry.id,
          title: entry.title,
          platform: entry.platform,
          scheduledDate: entry.scheduled_date,
          clientId: entry.client_id,
          clientName: client?.legal_name,
          clientEmail: client?.email,
          approvalUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/review/${entry.id}` // Assuming a review page exists or will exist
        })
      }).catch(err => console.error('[n8n] Webhook failed:', err))
    }

    return NextResponse.json({ success: true, entry })
  } catch (e) {
    console.error('[api/content-calendar] Error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
