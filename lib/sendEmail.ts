import nodemailer from 'nodemailer'

interface EmailParams {
  to: string | string[]
  subject: string
  text: string
  html?: string
  toName?: string
  attachments?: {
    filename: string
    content: string
    encoding?: string
    type?: string
    disposition?: string
  }[]
}

function clean(value: string) {
  return value.replace(/^["']|["']$/g, '').trim()
}

function parseSendLayerError(detail: string, status: number) {
  let message = detail.slice(0, 280)
  try {
    const parsed = JSON.parse(detail) as {
      Errors?: { Code?: number; Message?: string }[]
      Message?: string
    }
    const reasons = parsed.Errors?.map((item) => {
      if (item.Code && item.Message) return `${item.Message} (code ${item.Code})`
      return item.Message
    }).filter(Boolean)
    if (reasons?.length) message = reasons.join(' · ')
    else if (parsed.Message) message = parsed.Message
  } catch {
    /* keep the raw response */
  }
  return message || `SendLayer rejected the message (${status})`
}

async function sendWithApi(input: {
  apiKey: string
  fromEmail: string
  fromName: string
  recipients: { name: string; email: string }[]
  subject: string
  html: string
  text: string
  attachments?: EmailParams['attachments']
}) {
  const payload: Record<string, unknown> = {
    From: { name: input.fromName, email: input.fromEmail },
    To: input.recipients,
    Subject: input.subject.slice(0, 200),
    ContentType: 'HTML',
    HTMLContent: input.html,
    PlainContent: input.text.slice(0, 100_000) || input.subject,
  }

  if (input.attachments?.length) {
    payload.Attachments = input.attachments.map((file) => ({
      Filename: file.filename,
      Content: file.content,
      Type: file.type || 'application/octet-stream',
      Disposition: file.disposition || 'attachment',
    }))
  }

  const response = await fetch('https://console.sendlayer.com/api/v1/email', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const detail = await response.text()
  console.info('[sendlayer:api]', response.status, detail.slice(0, 400))

  if (!response.ok) {
    throw new Error(parseSendLayerError(detail, response.status))
  }

  try {
    const parsed = JSON.parse(detail) as { MessageID?: string; Errors?: { Message?: string; Code?: number }[] }
    if (parsed.Errors?.length) throw new Error(parseSendLayerError(detail, response.status))
    return parsed.MessageID || 'accepted'
  } catch (error) {
    if (error instanceof SyntaxError) return 'accepted'
    throw error
  }
}

async function sendWithSmtp(input: {
  fromEmail: string
  fromName: string
  to: string | string[]
  subject: string
  html: string
  text: string
  attachments?: EmailParams['attachments']
}) {
  const host = clean(process.env.SENDLAYER_SMTP_HOST || process.env.SMTP_HOST || 'smtp.sendlayer.net')
  const port = Number(clean(process.env.SENDLAYER_SMTP_PORT || process.env.SMTP_PORT || '587'))
  const user = clean(process.env.SENDLAYER_SMTP_USER || process.env.SMTP_USER || '')
  const pass = clean(process.env.SENDLAYER_SMTP_PASS || process.env.SMTP_PASS || '')
  if (!user || !pass) {
    throw new Error('SMTP is not configured. Add SENDLAYER_SMTP_USER and SENDLAYER_SMTP_PASS from SendLayer → SMTP Credentials.')
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  const info = await transporter.sendMail({
    from: `"${input.fromName}" <${input.fromEmail}>`,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    attachments: input.attachments?.map((file) => ({
      filename: file.filename,
      content: file.content,
      encoding: (file.encoding as 'base64') || 'base64',
      contentType: file.type,
    })),
  })

  console.info('[sendlayer:smtp]', info.messageId || 'accepted')
  return info.messageId || 'accepted'
}

export async function sendEmail({ to, subject, text, html, toName, attachments }: EmailParams) {
  const apiKey = clean(process.env.SENDLAYER_API_KEY || '')
  const fromEmail = clean(process.env.SENDLAYER_FROM_EMAIL || process.env.SMTP_USER || '')
  const fromName = clean(process.env.SENDLAYER_FROM_NAME || process.env.SMTP_FROM_NAME || '') || 'Petrosphere'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
    throw new Error('Set SENDLAYER_FROM_EMAIL to a full address on your verified SendLayer domain.')
  }

  const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({
    name: (toName || email).slice(0, 120),
    email: email.trim().toLowerCase(),
  }))
  const htmlBody = html || `<p>${text}</p>`
  const textBody = text || subject

  const smtpReady = !!(clean(process.env.SENDLAYER_SMTP_USER || process.env.SMTP_USER || '') && clean(process.env.SENDLAYER_SMTP_PASS || process.env.SMTP_PASS || ''))
  const errors: string[] = []

  if (apiKey) {
    try {
      return await sendWithApi({
        apiKey,
        fromEmail,
        fromName,
        recipients,
        subject,
        html: htmlBody,
        text: textBody,
        attachments,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'API send failed'
      errors.push(message)
      console.error('[sendlayer:api:fail]', message)
      if (!smtpReady) throw error
    }
  }

  if (smtpReady) {
    try {
      return await sendWithSmtp({
        fromEmail,
        fromName,
        to: recipients.map((person) => person.email),
        subject,
        html: htmlBody,
        text: textBody,
        attachments,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SMTP send failed'
      errors.push(message)
      console.error('[sendlayer:smtp:fail]', message)
      throw new Error(errors.filter(Boolean).join(' · '))
    }
  }

  throw new Error(errors[0] || 'Add SENDLAYER_API_KEY, or SENDLAYER_SMTP_USER and SENDLAYER_SMTP_PASS.')
}
