import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/sendEmail'
import { applyMerge, applyMergePlain, htmlToText } from '@/lib/email-document'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Recipient = { email?: string; name?: string; company?: string }

async function sendWithSendLayer(input: {
  toEmail: string
  toName: string
  subject: string
  html: string
  text: string
}) {
  await sendEmail({
    to: input.toEmail,
    toName: input.toName,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Sign in to send email.' }, { status: 401 })

  const body = await request.json().catch(() => null) as {
    subject?: string
    html?: string
    recipients?: Recipient[]
  } | null

  const subject = body?.subject?.trim() || ''
  const html = body?.html || ''
  const recipients = (body?.recipients || [])
    .map((person) => ({
      email: person.email?.trim().toLowerCase() || '',
      name: person.name?.trim() || '',
      company: person.company?.trim() || '',
    }))
    .filter((person) => EMAIL.test(person.email))
    .slice(0, 25)

  if (!subject) return NextResponse.json({ error: 'Add a subject line.' }, { status: 400 })
  if (!html || html.length > 900_000) return NextResponse.json({ error: 'The email body is missing or too large.' }, { status: 400 })
  if (!recipients.length) return NextResponse.json({ error: 'Choose at least one valid recipient.' }, { status: 400 })

  const sent: string[] = []
  const failed: { email: string; error: string }[] = []

  for (const person of recipients) {
    const personalHtml = applyMerge(html, person)
    const personalSubject = applyMergePlain(subject, person)
    try {
      await sendWithSendLayer({
        toEmail: person.email,
        toName: person.name || person.email,
        subject: personalSubject,
        html: personalHtml,
        text: htmlToText(personalHtml),
      })
      sent.push(person.email)
    } catch (error) {
      failed.push({ email: person.email, error: error instanceof Error ? error.message : 'Send failed' })
    }
  }

  return NextResponse.json({ sent: sent.length, failed })
}
