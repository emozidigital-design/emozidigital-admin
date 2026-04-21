import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { BrevoClient, BrevoEnvironment } from '@getbrevo/brevo'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: row, error } = await supabase
      .from('clients')
      .select('legal_name, email')
      .eq('id', params.id)
      .single()

    if (error || !row) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const name  = row.legal_name || 'there'
    const email = row.email

    if (!email) {
      return NextResponse.json({ error: 'No email address on file' }, { status: 400 })
    }

    const brevo = new BrevoClient({
      apiKey: process.env.BREVO_API_KEY!,
      environment: BrevoEnvironment.Default,
    })

    await brevo.transactionalEmails.sendTransacEmail({
      to:      [{ email, name }],
      sender:  { email: 'hello@emozidigital.com', name: 'Emozi Digital' },
      subject: 'Your onboarding is waiting — complete it today!',
      htmlContent: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
          <h2 style="color:#003434;">Hi ${name} 👋</h2>
          <p>We noticed your onboarding form still has some sections to complete. Filling them in helps us build the best strategy for your brand.</p>
          <p>It only takes a few minutes — jump back in whenever you&apos;re ready.</p>
          <br/>
          <p style="color:#70BF4B;font-weight:bold;">— The Emozi Digital Team</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
