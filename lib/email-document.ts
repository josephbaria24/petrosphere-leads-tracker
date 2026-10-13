export type BlockType = 'hero' | 'heading' | 'text' | 'image' | 'button' | 'offer' | 'divider' | 'spacer'

export type EmailBlock = {
  id: string
  type: BlockType
  fields: Record<string, string>
}

export type EmailDraft = {
  name: string
  subject: string
  preview: string
  font?: string
  blocks: EmailBlock[]
}

export const EMAIL_FONTS = [
  { id: 'arial', label: 'Arial', stack: 'Arial, Helvetica, sans-serif' },
  { id: 'georgia', label: 'Georgia', stack: 'Georgia, Times, serif' },
  { id: 'verdana', label: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
  { id: 'trebuchet', label: 'Trebuchet', stack: "'Trebuchet MS', Helvetica, sans-serif" },
  { id: 'times', label: 'Times New Roman', stack: "'Times New Roman', Times, serif" },
  { id: 'courier', label: 'Courier', stack: "'Courier New', Courier, monospace" },
] as const

export function fontStack(id?: string) {
  return EMAIL_FONTS.find((font) => font.id === id)?.stack || EMAIL_FONTS[0].stack
}

export const BLOCK_LABEL: Record<BlockType, string> = {
  hero: 'Hero',
  heading: 'Heading',
  text: 'Text',
  image: 'Image',
  button: 'Button',
  offer: 'Promotion',
  divider: 'Divider',
  spacer: 'Spacer',
}

export function createBlock(type: BlockType, id = ''): EmailBlock {
  const blockId = id || crypto.randomUUID()
  const defaults: Record<BlockType, Record<string, string>> = {
    hero: {
      eyebrow: 'Petrosphere',
      title: 'A new offer for your team',
      subtitle: 'Training, consulting, and webinars built for operators across the region.',
    },
    heading: { text: 'What is included', align: 'left' },
    text: {
      text: 'Hi {{name}},\n\nHere is a short note from Petrosphere. Tell your readers what is new, why it matters, and what they should do next.',
      align: 'left',
    },
    image: { url: '', alt: 'Promotion image', align: 'center', width: '100', link: '' },
    button: { label: 'Reserve a seat', url: 'https://petrosphere.com', align: 'left' },
    offer: {
      title: 'Webinar seat',
      detail: 'Live session with the Petrosphere team. Bring your questions.',
      price: 'Free',
      buttonLabel: 'Save my seat',
      buttonUrl: 'https://petrosphere.com',
    },
    divider: {},
    spacer: { size: '24' },
  }
  return { id: blockId, type, fields: defaults[type] }
}

export const STARTER_TEMPLATES: { id: string; name: string; description: string; draft: EmailDraft }[] = [
  {
    id: 'promo',
    name: 'Service promotion',
    description: 'Headline, offer card, and a clear button.',
    draft: {
      name: 'Service promotion',
      subject: 'A Petrosphere offer for {{company}}',
      preview: 'Training and consulting dates are open.',
      blocks: [
        createBlock('hero', 'promo-hero'),
        { ...createBlock('text', 'promo-text'), fields: { text: 'Hi {{name}},\n\nWe opened a new round of on-site and online sessions. Teams use them to tighten operations and bring new staff up to speed.', align: 'left' } },
        createBlock('offer', 'promo-offer'),
        createBlock('button', 'promo-button'),
      ],
    },
  },
  {
    id: 'webinar',
    name: 'Webinar invite',
    description: 'Invite leads to the next live session.',
    draft: {
      name: 'Webinar invite',
      subject: '{{name}}, you are invited to our next webinar',
      preview: 'Save a seat for the upcoming Petrosphere session.',
      blocks: [
        { ...createBlock('hero', 'webinar-hero'), fields: { eyebrow: 'Live webinar', title: 'Join us for the next session', subtitle: 'One hour. Practical examples. Time for questions.' } },
        { ...createBlock('text', 'webinar-text'), fields: { text: 'Hi {{name}},\n\nWe saved a place in the next webinar for contacts at {{company}}. Reply or use the button below and we will send the joining details.', align: 'left' } },
        { ...createBlock('button', 'webinar-button'), fields: { label: 'Count me in', url: 'https://petrosphere.com', align: 'left' } },
      ],
    },
  },
  {
    id: 'newsletter',
    name: 'Monthly note',
    description: 'A short update with two sections.',
    draft: {
      name: 'Monthly note',
      subject: 'This month at Petrosphere',
      preview: 'Wins, upcoming sessions, and how to reach us.',
      blocks: [
        { ...createBlock('hero', 'note-hero'), fields: { eyebrow: 'Monthly note', title: 'What we have been working on', subtitle: 'A short update for clients and leads.' } },
        { ...createBlock('heading', 'note-heading'), fields: { text: 'Coming up', align: 'left' } },
        { ...createBlock('text', 'note-text'), fields: { text: 'Hi {{name}},\n\nAdd the dates, the offer, and the one action you want people to take.', align: 'left' } },
        createBlock('divider', 'note-divider'),
        { ...createBlock('heading', 'note-heading-2'), fields: { text: 'Talk to us', align: 'left' } },
        { ...createBlock('button', 'note-button'), fields: { label: 'Book a call', url: 'https://petrosphere.com', align: 'left' } },
      ],
    },
  },
]

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function textToHtml(value: string) {
  return escapeHtml(value).replace(/\n/g, '<br />')
}

function safeUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed || /^javascript:/i.test(trimmed)) return ''
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) return trimmed
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) return `https://${trimmed}`
  return ''
}

function renderBlock(block: EmailBlock, font: string) {
  const align = block.fields.align === 'center' || block.fields.align === 'right' ? block.fields.align : 'left'
  const family = fontStack(block.fields.font || font)
  const link = safeUrl(block.fields.link || '')
  if (block.type === 'hero') {
    return `<tr><td style="background:#00044a;padding:36px 32px;color:#ffffff;font-family:${family};text-align:${align};">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#93c5fd;font-family:${family};">${escapeHtml(block.fields.eyebrow || '')}</p>
      <h1 style="margin:0 0 8px;font-size:28px;line-height:1.2;font-family:${family};">${escapeHtml(block.fields.title || '')}</h1>
      <p style="margin:0;font-size:15px;line-height:1.5;color:#dbeafe;font-family:${family};">${escapeHtml(block.fields.subtitle || '')}</p>
    </td></tr>`
  }
  if (block.type === 'heading') {
    const heading = escapeHtml(block.fields.text || '')
    const body = link ? `<a href="${escapeHtml(link)}" style="color:#18181b;text-decoration:none;">${heading}</a>` : heading
    return `<tr><td style="padding:22px 32px 0;text-align:${align};font-family:${family};"><h2 style="margin:0;font-size:20px;color:#18181b;font-family:${family};">${body}</h2></td></tr>`
  }
  if (block.type === 'text') {
    const copy = textToHtml(block.fields.text || '')
    const body = link ? `<a href="${escapeHtml(link)}" style="color:#0369a1;text-decoration:underline;">${copy}</a>` : copy
    return `<tr><td style="padding:14px 32px 0;text-align:${align};font-size:15px;line-height:1.6;color:#3f3f46;font-family:${family};">${body}</td></tr>`
  }
  if (block.type === 'image') {
    if (!block.fields.url) return ''
    const width = Math.max(20, Math.min(100, Number(block.fields.width) || 100))
    const img = `<img src="${escapeHtml(block.fields.url)}" alt="${escapeHtml(block.fields.alt || '')}" width="${Math.round(536 * width / 100)}" style="display:inline-block;width:${width}%;max-width:${width}%;border:0;border-radius:10px;" />`
    const imageLink = safeUrl(block.fields.link || '')
    const body = imageLink ? `<a href="${escapeHtml(imageLink)}">${img}</a>` : img
    return `<tr><td align="${align}" style="padding:16px 32px 0;text-align:${align};font-size:0;">${body}</td></tr>`
  }
  if (block.type === 'button') {
    const href = safeUrl(block.fields.url || '') || '#'
    return `<tr><td style="padding:18px 32px 0;text-align:${align};font-family:${family};"><a href="${escapeHtml(href)}" style="display:inline-block;background:#00044a;color:#ffffff;text-decoration:none;font-family:${family};font-size:14px;font-weight:600;padding:12px 18px;border-radius:8px;">${escapeHtml(block.fields.label || 'Open')}</a></td></tr>`
  }
  if (block.type === 'offer') {
    const href = safeUrl(block.fields.buttonUrl || '') || '#'
    return `<tr><td style="padding:18px 32px 0;font-family:${family};"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e4e4e7;border-radius:12px;"><tr><td style="padding:18px 18px 16px;font-family:${family};text-align:${align};">
      <p style="margin:0;font-size:12px;color:#0369a1;font-weight:700;font-family:${family};">${escapeHtml(block.fields.price || '')}</p>
      <h3 style="margin:6px 0;font-size:18px;color:#18181b;font-family:${family};">${escapeHtml(block.fields.title || '')}</h3>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.5;color:#52525b;font-family:${family};">${escapeHtml(block.fields.detail || '')}</p>
      <a href="${escapeHtml(href)}" style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-family:${family};font-size:13px;font-weight:600;padding:10px 14px;border-radius:8px;">${escapeHtml(block.fields.buttonLabel || 'Learn more')}</a>
    </td></tr></table></td></tr>`
  }
  if (block.type === 'divider') {
    return `<tr><td style="padding:18px 32px 0;"><div style="height:1px;background:#e4e4e7;"></div></td></tr>`
  }
  const size = Math.max(8, Math.min(64, Number(block.fields.size) || 24))
  return `<tr><td style="height:${size}px;line-height:${size}px;font-size:0;">&nbsp;</td></tr>`
}

export function renderEmailHtml(blocks: EmailBlock[], font = 'arial') {
  const rows = blocks.map((block) => renderBlock(block, font)).join('')
  const family = fontStack(font)
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:${family};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
          ${rows}
          <tr><td style="padding:28px 32px 32px;font-size:12px;line-height:1.5;color:#a1a1aa;">You are receiving this because you are in the Petrosphere leads list. {{company}}</td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`
}

export function applyMerge(html: string, person: { name?: string; company?: string; email?: string }) {
  const name = person.name?.trim() || 'there'
  const company = person.company?.trim() || 'your team'
  return html
    .replaceAll('{{name}}', escapeHtml(name))
    .replaceAll('{{company}}', escapeHtml(company))
    .replaceAll('{{email}}', escapeHtml(person.email || ''))
}

export function applyMergePlain(text: string, person: { name?: string; company?: string; email?: string }) {
  const name = person.name?.trim() || 'there'
  const company = person.company?.trim() || 'your team'
  return text
    .replaceAll('{{name}}', name)
    .replaceAll('{{company}}', company)
    .replaceAll('{{email}}', person.email || '')
}

export function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}
