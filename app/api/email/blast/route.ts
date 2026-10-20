import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/sendEmail'
import { applyMerge, applyMergePlain, htmlToText } from '@/lib/email-document'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Recipient = { email?: string; name?: string; company?: string }

function shrinkHtml(html: string) {
  return html.replace(/src="data:image\/[^"]+"/gi, 'src="" alt="Image removed for sending"')
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Sign in again, then press Test.' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    subject?: string
    html?: string
    recipients?: Recipient[]
    mode?: 'test' | 'blast'
  } | null

  const mode = body?.mode === 'test' ? 'test' : 'blast'
  const campaignSubject = body?.subject?.trim() || 'Petrosphere email'
  const rawHtml = body?.html || ''
  const recipients = (body?.recipients || [])
    .map((person) => ({
      email: person.email?.trim().toLowerCase() || '',
      name: person.name?.trim() || '',
      company: person.company?.trim() || '',
    }))
    .filter((person) => EMAIL.test(person.email))
    .slice(0, 25)

  // Gmail often files full promo HTML under Promotions / skips Primary.
  // Tests use a short transactional note so they show in Inbox more reliably.
  const subject = mode === 'test' ? `CRM test · ${campaignSubject}`.slice(0, 200) : campaignSubject
  const html =
    mode === 'test'
      ? `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#18181b;line-height:1.5;padding:16px;">
          <p>This is a Petrosphere CRM delivery test.</p>
          <p>Campaign subject: <strong>${campaignSubject.replace(/</g, '&lt;')}</strong></p>
          <p>If you received this, SendLayer and your sender address are working.</p>
          <hr style="border:none;border-top:1px solid #e4e4e7;margin:20px 0;" />
          <p style="font-size:12px;color:#71717a;">Full campaign HTML is used for real blasts, not this test note.</p>
        </body></html>`
      : shrinkHtml(rawHtml)

  if (!subject) return NextResponse.json({ error: 'Add a subject line first.' }, { status: 400 })
  if (!html || html.length > 900_000) {
    return NextResponse.json({ error: 'The email body is missing or too large.' }, { status: 400 })
  }
  if (!recipients.length) {
    return NextResponse.json({ error: 'Enter a valid test address first.' }, { status: 400 })
  }

  const config = {
    hasApiKey: !!process.env.SENDLAYER_API_KEY?.trim(),
    fromEmail: process.env.SENDLAYER_FROM_EMAIL?.trim() || '',
    hasSmtp: !!(
      (process.env.SENDLAYER_SMTP_USER || process.env.SMTP_USER)?.trim() &&
      (process.env.SENDLAYER_SMTP_PASS || process.env.SMTP_PASS)?.trim()
    ),
  }
  console.info('[email:blast]', { mode, to: recipients.map((person) => person.email), ...config, htmlBytes: html.length })

  const sent: string[] = []
  const failed: { email: string; error: string }[] = []
  const messageIds: string[] = []

  for (const person of recipients) {
    const personalHtml = applyMerge(html, person)
    const personalSubject = applyMergePlain(subject, person)
    try {
      const messageId = await sendEmail({
        to: person.email,
        toName: person.name || person.email,
        subject: personalSubject,
        html: personalHtml,
        text: htmlToText(personalHtml).slice(0, 100_000) || personalSubject,
      })
      sent.push(person.email)
      if (messageId) messageIds.push(messageId)
    } catch (error) {
      failed.push({
        email: person.email,
        error: error instanceof Error ? error.message : 'Send failed',
      })
    }
  }

  if (!sent.length) {
    return NextResponse.json(
      {
        error: failed[0]?.error || 'SendLayer did not accept the message.',
        sent: 0,
        failed,
        config: {
          hasApiKey: config.hasApiKey,
          hasSmtp: config.hasSmtp,
          fromEmail: config.fromEmail,
        },
      },
      { status: 502 }
    )
  }

  return NextResponse.json({ sent: sent.length, failed, messageId: messageIds[0] || null })
}
