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

export async function sendEmail({ to, subject, text, html, toName, attachments }: EmailParams) {
  const apiKey = process.env.SENDLAYER_API_KEY
  const fromEmail = process.env.SENDLAYER_FROM_EMAIL?.trim() || ''
  const fromName = process.env.SENDLAYER_FROM_NAME || 'Petrosphere'
  if (!apiKey) throw new Error('Add SENDLAYER_API_KEY from the SendLayer API Keys tab.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
    throw new Error('The sender must be a full email address, such as info@petrosphere.com.ph.')
  }

  const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({
    name: toName || email,
    email,
  }))

  const response = await fetch('https://console.sendlayer.com/api/v1/email', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      From: { name: fromName, email: fromEmail },
      To: recipients,
      Subject: subject,
      ContentType: html ? 'HTML' : 'Plain',
      HTMLContent: html || `<p>${text}</p>`,
      PlainContent: text,
      Tags: ['petrosphere'],
      ...(attachments?.length
        ? {
            Attachments: attachments.map((file) => ({
              Filename: file.filename,
              Content: file.content,
              Type: file.type || 'application/octet-stream',
              Disposition: file.disposition || 'attachment',
            })),
          }
        : {}),
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    let message = detail.slice(0, 280)
    try {
      const parsed = JSON.parse(detail) as { Errors?: { Message?: string }[] }
      const reasons = parsed.Errors?.map((item) => item.Message).filter(Boolean)
      if (reasons?.length) message = reasons.join(' ')
    } catch {
      /* keep the raw response */
    }
    throw new Error(message || 'SendLayer rejected the message')
  }
}
