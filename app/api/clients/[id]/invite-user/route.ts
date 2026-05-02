import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { BrevoClient, BrevoEnvironment } from '@getbrevo/brevo'
import { signInviteToken } from '@/lib/invite-token'

export const dynamic = 'force-dynamic'

const VALID_ROLES = ['admin', 'editor', 'viewer'] as const
type Role = (typeof VALID_ROLES)[number]

const PORTAL_URL = process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL ?? 'https://emozidigital.com'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('client_users')
      .select('id, email, full_name, role, status, password_set_at, invited_at')
      .eq('client_id', params.id)
      .order('invited_at', { ascending: true })

    if (error) throw error
    return NextResponse.json({ users: data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const email: string | undefined = body?.email?.toLowerCase?.().trim()
    const fullName: string | undefined = body?.full_name?.trim() || undefined
    const role: Role = VALID_ROLES.includes(body?.role) ? body.role : 'editor'

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('id, legal_name')
      .eq('id', params.id)
      .single()

    if (clientErr || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const { data: existing } = await supabase
      .from('client_users')
      .select('id, password_hash, status')
      .eq('client_id', params.id)
      .eq('email', email)
      .maybeSingle()

    if (existing?.password_hash) {
      return NextResponse.json(
        { error: 'User already has an account' },
        { status: 409 }
      )
    }

    let userId = existing?.id as string | undefined

    if (userId) {
      const { error: updErr } = await supabase
        .from('client_users')
        .update({
          full_name: fullName ?? null,
          role,
          status: 'invited',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
      if (updErr) throw new Error(updErr.message)
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('client_users')
        .insert({
          email,
          full_name: fullName ?? null,
          client_id: params.id,
          role,
          status: 'invited',
        })
        .select('id')
        .single()
      if (insErr || !inserted) throw new Error(insErr?.message ?? 'Failed to insert user')
      userId = inserted.id
    }

    const { token, expiresAt } = await signInviteToken({
      userId: userId!,
      clientId: params.id,
      email,
    })

    const { error: tokErr } = await supabase.from('auth_tokens').insert({
      user_id: userId,
      token,
      token_hash: token,
      type: 'invite',
      expires_at: expiresAt.toISOString(),
    })
    if (tokErr) throw new Error(tokErr.message)

    const setupLink = `${PORTAL_URL}/client/setup?token=${encodeURIComponent(token)}`
    const greetingName = fullName || 'there'
    const brandName = client.legal_name || 'Emozi Digital'

    const brevo = new BrevoClient({
      apiKey: process.env.BREVO_API_KEY!,
      environment: BrevoEnvironment.Default,
    })

    await brevo.transactionalEmails.sendTransacEmail({
      to: [{ email, name: fullName || email }],
      sender: { email: 'hello@emozidigital.com', name: 'Emozi Digital' },
      subject: `You're invited to the ${brandName} client portal`,
      htmlContent: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
          <h2 style="color:#003434;">Hi ${greetingName} 👋</h2>
          <p>You've been invited to access the <strong>${brandName}</strong> client portal on Emozi Digital.</p>
          <p>Click the button below to set your password and get started. This link expires in <strong>7 days</strong>.</p>
          <p>
            <a href="${setupLink}"
               style="display:inline-block;margin:20px 0;padding:12px 28px;background:#70BF4B;color:#003434;border-radius:8px;text-decoration:none;font-weight:700;">
              Set up your account
            </a>
          </p>
          <p style="color:#64748b;font-size:13px;">If the button doesn't work, paste this link into your browser:<br/><span style="word-break:break-all;">${setupLink}</span></p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
          <p style="color:#70BF4B;font-weight:bold;">— The Emozi Digital Team</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true, userId, expiresAt: expiresAt.toISOString() })
  } catch (e) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e) ?? String(e)
    console.error('[invite-user] Error:', e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
