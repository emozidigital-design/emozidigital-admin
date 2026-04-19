import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { Client } from '@notionhq/client'
import { BrevoClient, BrevoEnvironment } from '@getbrevo/brevo'

const notion = new Client({ auth: process.env.NOTION_API_KEY })

const contactSchema = z.object({
  name:        z.string().min(1),
  company:     z.string().min(1),
  email:       z.string().email(),
  phone:       z.string().min(1),
  service:     z.string().min(1),
  message:     z.string().min(1),
  monthlyGoal: z.string().optional(),
  nextStep:    z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = contactSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, company, email, phone, service, message, monthlyGoal, nextStep } = parsed.data
    const clientId = nanoid(8)

    // ── 1. Create Notion record ──────────────────────────────────────────────
    await notion.pages.create({
      parent: { database_id: process.env.NOTION_CLIENTS_DB! },
      properties: {
        'Client ID':  { rich_text: [{ text: { content: clientId } }] },
        'Legal Name': { title:     [{ text: { content: name } }] },
        'Email':      { email:     email },
        'WhatsApp':   { phone_number: phone },
        'Package':    { select:    { name: service } },
      },
    })

    // ── 2. Send confirmation email via Brevo ─────────────────────────────────
    const brevo = new BrevoClient({
      apiKey: process.env.BREVO_API_KEY!,
      environment: BrevoEnvironment.Default,
    })

    await brevo.transactionalEmails.sendTransacEmail({
      to:      [{ email, name }],
      sender:  { email: 'hello@emozidigital.com', name: 'Emozi Digital' },
      subject: 'We received your inquiry',
      htmlContent: `
        <h2>Hi ${name}, thanks for reaching out!</h2>
        <p>We've received your inquiry about <strong>${service}</strong> and will be in touch shortly.</p>
        ${nextStep    ? `<p><strong>Next step:</strong> ${nextStep}</p>`       : ''}
        ${monthlyGoal ? `<p><strong>Your goal:</strong> ${monthlyGoal}</p>`    : ''}
        <p>Your message: <em>${message}</em></p>
        <br/>
        <p>— The Emozi Digital Team</p>
      `,
    })

    // ── 3. WhatsApp notification (placeholder — swap in real API when ready) ──
    const waMessage = `New lead: ${name} from ${company} interested in ${service}`
    console.log('[WhatsApp notify]', waMessage)
    // TODO: replace with Twilio / WhatsApp Business API call
    // await sendWhatsApp({ to: process.env.OWNER_WHATSAPP!, body: waMessage })

    return NextResponse.json({ success: true, clientId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
