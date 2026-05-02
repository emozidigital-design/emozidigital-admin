import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const VALID_ROLES = ['admin', 'editor', 'viewer'] as const
const VALID_STATUSES = ['invited', 'active', 'suspended'] as const

/**
 * PATCH /api/clients/[id]/invite-user/[userId]
 * Update a specific user's role or status.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const { id: clientId, userId } = params
    const body = await req.json()

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (body.role) {
      if (!VALID_ROLES.includes(body.role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      updateData.role = body.role
    }

    if (body.status) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updateData.status = body.status
    }

    const { error } = await supabase
      .from('client_users')
      .update(updateData)
      .eq('id', userId)
      .eq('client_id', clientId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[invite-user PATCH] Error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

/**
 * DELETE /api/clients/[id]/invite-user/[userId]
 * Remove a specific user's access entirely.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const { id: clientId, userId } = params

    // 1. Delete auth tokens
    await supabase.from('auth_tokens').delete().eq('user_id', userId)

    // 2. Delete the user
    const { error } = await supabase
      .from('client_users')
      .delete()
      .eq('id', userId)
      .eq('client_id', clientId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[invite-user DELETE] Error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
