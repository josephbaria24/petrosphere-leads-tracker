'use client'

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  GripVertical,
  Heading,
  Image as ImageIcon,
  Loader2,
  Mail,
  Megaphone,
  Minus,
  MousePointerClick,
  Send,
  Space,
  Sparkles,
  Trash2,
  Type,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase-client'
import { SidebarInset } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  BLOCK_LABEL,
  EMAIL_FONTS,
  STARTER_TEMPLATES,
  applyMerge,
  createBlock,
  fontStack,
  renderEmailHtml,
  type BlockType,
  type EmailBlock,
  type EmailDraft,
} from '@/lib/email-document'

const STORAGE_KEY = 'petrosphere-email-draft'
const TEMPLATE_KEY = 'petrosphere-email-templates'

const PALETTE: { type: BlockType; icon: typeof Type; hint: string }[] = [
  { type: 'hero', icon: Sparkles, hint: 'Colored opener' },
  { type: 'heading', icon: Heading, hint: 'Section title' },
  { type: 'text', icon: Type, hint: 'Paragraph' },
  { type: 'image', icon: ImageIcon, hint: 'Picture you can place' },
  { type: 'button', icon: MousePointerClick, hint: 'Link button' },
  { type: 'offer', icon: Megaphone, hint: 'Promotion card' },
  { type: 'divider', icon: Minus, hint: 'Thin line' },
  { type: 'spacer', icon: Space, hint: 'Empty gap' },
]

type LeadRecipient = { email: string; name: string; company: string; status: string }

function loadDraft(): EmailDraft {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as EmailDraft | null
    if (saved?.blocks?.length && saved.subject) return saved
  } catch {
    /* use the starter */
  }
  return STARTER_TEMPLATES[0].draft
}

export function EmailStudio() {
  const [draft, setDraft] = useState<EmailDraft>(STARTER_TEMPLATES[0].draft)
  const [ready, setReady] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(STARTER_TEMPLATES[0].draft.blocks[0]?.id ?? null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [templates, setTemplates] = useState(STARTER_TEMPLATES.map((item) => item.draft))
  const [leads, setLeads] = useState<LeadRecipient[]>([])
  const [loadingLeads, setLoadingLeads] = useState(true)
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [testEmail, setTestEmail] = useState('')
  const [sending, setSending] = useState<'test' | 'blast' | null>(null)
  const [confirmBlast, setConfirmBlast] = useState(false)
  const canvasColumnRef = useRef<HTMLElement>(null)
  const [sideHeight, setSideHeight] = useState<number | null>(null)

  useEffect(() => {
    const next = loadDraft()
    setDraft(next)
    setSelectedId(next.blocks[0]?.id ?? null)
    try {
      const saved = JSON.parse(localStorage.getItem(TEMPLATE_KEY) || 'null') as EmailDraft[] | null
      if (Array.isArray(saved) && saved.length) setTemplates(saved)
    } catch {
      /* starters stay */
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  }, [draft, ready])

  useEffect(() => {
    let cancel = false
    const load = async () => {
      const pageSize = 1000
      const rows: LeadRecipient[] = []
      for (let from = 0; from < 4000; from += pageSize) {
        const { data, error } = await supabase
          .from('crm_leads')
          .select('contact_name, email, company, status')
          .range(from, from + pageSize - 1)
        if (error) break
        for (const row of data || []) {
          const email = String(row.email || '').trim()
          if (!email.includes('@')) continue
          rows.push({
            email,
            name: String(row.contact_name || '').trim(),
            company: String(row.company || '').trim(),
            status: String(row.status || '').trim(),
          })
        }
        if (!data || data.length < pageSize) break
      }
      if (cancel) return
      const unique = new Map<string, LeadRecipient>()
      rows.forEach((row) => {
        if (!unique.has(row.email.toLowerCase())) unique.set(row.email.toLowerCase(), row)
      })
      setLeads([...unique.values()])
      setLoadingLeads(false)
    }
    load()
    return () => {
      cancel = true
    }
  }, [])

  useEffect(() => {
    const column = canvasColumnRef.current
    if (!column) return
    const measure = () => {
      if (window.innerWidth < 1280) {
        setSideHeight(null)
        return
      }
      setSideHeight(column.getBoundingClientRect().height)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(column)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [draft.blocks.length, draft.font])

  const selected = draft.blocks.find((block) => block.id === selectedId) ?? null
  const previewHtml = useMemo(
    () => applyMerge(renderEmailHtml(draft.blocks, draft.font), { name: 'Alex', company: 'Sample Company', email: 'alex@example.com' }),
    [draft.blocks, draft.font]
  )
  const visibleLeads = leads.filter((lead) => {
    const haystack = `${lead.name} ${lead.email} ${lead.company} ${lead.status}`.toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })
  const recipients = leads.filter((lead) => picked.has(lead.email.toLowerCase()))

  const updateBlock = (id: string, fields: Record<string, string>) => {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) => (block.id === id ? { ...block, fields: { ...block.fields, ...fields } } : block)),
    }))
  }

  const insertBlock = (type: BlockType, index: number) => {
    const block = createBlock(type)
    setDraft((current) => {
      const blocks = current.blocks.slice()
      blocks.splice(index, 0, block)
      return { ...current, blocks }
    })
    setSelectedId(block.id)
  }

  const moveBlock = (id: string, index: number) => {
    setDraft((current) => {
      const blocks = current.blocks.slice()
      const from = blocks.findIndex((block) => block.id === id)
      if (from < 0) return current
      const [item] = blocks.splice(from, 1)
      const target = from < index ? index - 1 : index
      blocks.splice(Math.max(0, target), 0, item)
      return { ...current, blocks }
    })
  }

  const saveTemplate = () => {
    const next = [{ ...draft, name: draft.name || draft.subject || 'Untitled template' }, ...templates.filter((item) => item.name !== draft.name)].slice(0, 12)
    setTemplates(next)
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(next))
    toast('Template saved', { description: next[0].name })
  }

  const sendBatch = async (people: LeadRecipient[], mode: 'test' | 'blast') => {
    const subject = draft.subject.trim()
    if (mode === 'blast' && !subject) {
      toast('Add a subject line first')
      return
    }
    if (mode === 'test') {
      const address = people[0]?.email?.trim() || ''
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
        toast('Enter a valid test address first')
        return
      }
    }
    setSending(mode)
    let sent = 0
    let messageId = ''
    const failures: string[] = []
    try {
      for (let index = 0; index < people.length; index += 15) {
        const chunk = people.slice(index, index + 15)
        const response = await fetch('/api/email/blast', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: subject || 'Petrosphere test email',
            html: renderEmailHtml(draft.blocks, draft.font),
            recipients: chunk,
            mode,
          }),
        })
        const payload = await response.json().catch(
          () =>
            ({} as {
              error?: string
              sent?: number
              messageId?: string | null
              failed?: { email: string; error: string }[]
              config?: { hasApiKey?: boolean; hasSmtp?: boolean; fromEmail?: string }
            })
        )
        if (!response.ok) {
          const hint = payload.config
            ? `From ${payload.config.fromEmail || '(missing)'} · API key ${payload.config.hasApiKey ? 'set' : 'missing'} · SMTP ${payload.config.hasSmtp ? 'set' : 'missing'}`
            : ''
          throw new Error([payload.error || 'Send failed', hint].filter(Boolean).join(' · '))
        }
        sent += Number(payload.sent || 0)
        if (payload.messageId) messageId = payload.messageId
        for (const item of payload.failed || []) failures.push(`${item.email}: ${item.error}`)
      }
      if (!sent) throw new Error(failures[0] || 'SendLayer did not accept the message.')
      if (failures.length) {
        toast(`Sent ${sent}, but some failed`, { description: failures[0] })
      } else {
        toast(mode === 'test' ? `Test sent to ${people[0]?.email}` : `Sent to ${sent} people`, {
          description: [
            mode === 'test'
              ? 'Look in Inbox (and Promotions). Subject starts with CRM test'
              : '',
            messageId ? `SendLayer id ${messageId}` : '',
          ]
            .filter(Boolean)
            .join(' · '),
        })
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Send failed')
    } finally {
      setSending(null)
      setConfirmBlast(false)
    }
  }

  return (
    <SidebarInset className="min-w-0 overflow-x-hidden">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <Mail className="size-5 shrink-0" />
            Email
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Build a promotion, drop in blocks, then send it through SendLayer.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={saveTemplate}>Save template</Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!!sending || !testEmail.includes('@')}
            onClick={() =>
              sendBatch(
                [{ email: testEmail.trim(), name: 'Test reader', company: 'your team', status: '' }],
                'test'
              )
            }
          >
            {sending === 'test' ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Test
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-[#00044a] text-white hover:bg-[#0a1168]"
            disabled={!!sending || recipients.length === 0}
            onClick={() => setConfirmBlast(true)}
          >
            {sending === 'blast' ? <Loader2 className="size-3.5 animate-spin" /> : <Megaphone className="size-3.5" />}
            Send to {recipients.length}
          </Button>
        </div>
      </div>

      {confirmBlast && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <span>Send “{draft.subject || 'this email'}” to {recipients.length} people?</span>
          <span className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setConfirmBlast(false)}>Cancel</Button>
            <Button type="button" size="sm" className="bg-[#00044a] text-white" onClick={() => sendBatch(recipients, 'blast')}>Send now</Button>
          </span>
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside
          className="order-2 space-y-3 overflow-auto rounded-xl border border-zinc-200 bg-card p-3 shadow-sm lg:order-1 xl:min-h-0 dark:border-zinc-800"
          style={sideHeight ? { maxHeight: sideHeight } : undefined}
        >
          <p className="text-xs font-semibold">Blocks</p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Drag a block onto the email.</p>
          <div className="grid gap-1.5">
            {PALETTE.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.type}
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('block-type', item.type)
                    event.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => insertBlock(item.type, draft.blocks.length)}
                  className="flex cursor-grab items-center gap-2 rounded-lg border border-zinc-200 px-2 py-1.5 text-left hover:bg-zinc-50 active:cursor-grabbing dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <Icon className="size-3.5 text-sky-600 dark:text-sky-400" />
                  <span>
                    <span className="block text-xs font-medium text-zinc-900 dark:text-zinc-100">{BLOCK_LABEL[item.type]}</span>
                    <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">{item.hint}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <p className="pt-2 text-xs font-semibold">Templates</p>
          <div className="space-y-1">
            {templates.map((template) => (
              <button
                key={template.name}
                type="button"
                onClick={() => {
                  setDraft(template)
                  setSelectedId(template.blocks[0]?.id ?? null)
                }}
                className="block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <span className="block font-medium">{template.name}</span>
                <span className="block truncate text-[10px] text-muted-foreground">{template.subject}</span>
              </button>
            ))}
          </div>
        </aside>

        <section ref={canvasColumnRef} className="order-1 min-w-0 lg:order-2">
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
              Campaign name
              <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1 h-9" />
            </label>
            <FriendlyText
              label="Subject"
              value={draft.subject}
              onChange={(subject) => setDraft({ ...draft, subject })}
              placeholder="What people see in their inbox"
            />
          </div>
          <ChoiceRow
            label="Font for this email"
            value={draft.font || 'arial'}
            options={EMAIL_FONTS.map((font) => ({ id: font.id, label: font.label }))}
            onChange={(font) => setDraft({ ...draft, font })}
            fontButtons
          />
          <div
            className="rounded-xl border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-900"
            onDragOver={(event) => event.preventDefault()}
          >
            <div className="mx-auto max-w-[600px] overflow-hidden rounded-2xl bg-white text-zinc-900 shadow-sm">
              {draft.blocks.map((block, index) => (
                <div key={block.id}>
                  <DropLine
                    active={dropIndex === index}
                    onDragOver={() => setDropIndex(index)}
                    onDrop={(event) => {
                      const type = event.dataTransfer.getData('block-type') as BlockType
                      const id = event.dataTransfer.getData('block-id')
                      if (type) insertBlock(type, index)
                      else if (id) moveBlock(id, index)
                      setDropIndex(null)
                    }}
                  />
                  <div
                    onClick={() => setSelectedId(block.id)}
                    className={cn(
                      'group relative border-2 border-transparent',
                      selectedId === block.id && 'border-sky-500'
                    )}
                  >
                    <button
                      type="button"
                      draggable
                      aria-label="Move block"
                      onDragStart={(event) => {
                        event.dataTransfer.setData('block-id', block.id)
                        event.dataTransfer.effectAllowed = 'move'
                      }}
                      className="absolute left-1 top-2 z-10 cursor-grab rounded bg-white/80 p-0.5 opacity-0 group-hover:opacity-100"
                    >
                      <GripVertical className="size-3.5 text-zinc-400" />
                    </button>
                    <BlockPreview
                      block={block}
                      font={draft.font}
                      onChange={(fields) => updateBlock(block.id, fields)}
                    />
                  </div>
                </div>
              ))}
              <DropLine
                active={dropIndex === draft.blocks.length}
                onDragOver={() => setDropIndex(draft.blocks.length)}
                onDrop={(event) => {
                  const type = event.dataTransfer.getData('block-type') as BlockType
                  const id = event.dataTransfer.getData('block-id')
                  if (type) insertBlock(type, draft.blocks.length)
                  else if (id) moveBlock(id, draft.blocks.length)
                  setDropIndex(null)
                }}
              />
              {draft.blocks.length === 0 && (
                <p className="px-6 py-16 text-center text-sm text-muted-foreground">Drop a block here to start the email.</p>
              )}
            </div>
          </div>
        </section>

        <aside
          className="order-3 flex min-h-0 flex-col gap-3 xl:overflow-hidden"
          style={sideHeight ? { height: sideHeight } : undefined}
        >
          <div className="shrink-0 overflow-auto rounded-xl border border-zinc-200 bg-card p-3 shadow-sm xl:max-h-[46%] dark:border-zinc-800">
            <p className="mb-2 text-xs font-semibold">{selected ? BLOCK_LABEL[selected.type] : 'Block'}</p>
            {selected ? (
              <BlockEditor
                block={selected}
                font={draft.font || 'arial'}
                onChange={(fields) => updateBlock(selected.id, fields)}
                onRemove={() => {
                  setDraft((current) => ({ ...current, blocks: current.blocks.filter((block) => block.id !== selected.id) }))
                  setSelectedId(null)
                }}
              />
            ) : (
              <p className="text-xs text-muted-foreground">Select a block in the email to edit it.</p>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-card p-3 shadow-sm dark:border-zinc-800">
            <div className="mb-2 flex shrink-0 items-center justify-between">
              <p className="text-xs font-semibold">Audience</p>
              {loadingLeads && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
            </div>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search leads" className="mb-2 h-8 shrink-0 text-xs" />
            <div className="mb-2 flex shrink-0 gap-2 text-[11px]">
              <button type="button" className="text-sky-700 dark:text-sky-300" onClick={() => setPicked(new Set(visibleLeads.map((lead) => lead.email.toLowerCase())))}>
                Select shown
              </button>
              <button type="button" className="text-muted-foreground" onClick={() => setPicked(new Set())}>Clear</button>
            </div>
            <div className="max-h-52 min-h-0 flex-1 space-y-1 overflow-auto xl:max-h-none">
              {visibleLeads.slice(0, 80).map((lead) => {
                const key = lead.email.toLowerCase()
                return (
                  <label key={key} className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={picked.has(key)}
                      onChange={() => {
                        setPicked((current) => {
                          const next = new Set(current)
                          if (next.has(key)) next.delete(key)
                          else next.add(key)
                          return next
                        })
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium">{lead.name || lead.email}</span>
                      <span className="block truncate text-[10px] text-zinc-500 dark:text-zinc-400">{lead.email}{lead.company ? ` · ${lead.company}` : ''}</span>
                    </span>
                  </label>
                )
              })}
              {!loadingLeads && visibleLeads.length === 0 && (
                <p className="text-xs text-muted-foreground">No leads with an email address match.</p>
              )}
            </div>
            <label className="mt-3 block text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
              Test address
              <Input value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder="you@company.com" className="mt-1 h-8 text-xs" />
            </label>
          </div>
        </aside>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="px-3 py-2 text-sm font-medium text-muted-foreground">Preview with sample name Alex</p>
        <iframe title="Email preview" sandbox="" srcDoc={previewHtml} className="h-[60vh] min-h-[420px] w-full bg-white sm:h-[70vh] sm:min-h-[560px] xl:h-[78vh] xl:min-h-[640px]" />
      </div>
    </SidebarInset>
  )
}

function DropLine({
  active,
  onDragOver,
  onDrop,
}: {
  active: boolean
  onDragOver: () => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        onDragOver()
      }}
      onDrop={(event) => {
        event.preventDefault()
        onDrop(event)
      }}
      className={cn('h-2 transition-all', active && 'h-3 bg-sky-400')}
    />
  )
}

function EditableText({
  value,
  onChange,
  className,
  multiline = false,
  rich = false,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  multiline?: boolean
  rich?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const skipCommit = useRef(false)
  const dirty = useRef(false)
  const seeding = useRef(false)
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    if (!editing || !ref.current) return
    const root = ref.current
    const original = valueRef.current
    const fill = () => {
      if (rich) writeEditor(root, original)
      else root.textContent = original
    }
    seeding.current = true
    fill()
    const current = rich ? readEditor(root) : root.textContent || ''
    if (current !== original) fill()
    root.focus()
    const settled = rich ? readEditor(root) : root.textContent || ''
    if (settled !== original) fill()
    seeding.current = false
    const frame = requestAnimationFrame(() => {
      if (!root.isConnected || dirty.current) return
      const seen = rich ? readEditor(root) : root.textContent || ''
      if (seen !== original) fill()
    })
    return () => cancelAnimationFrame(frame)
  }, [editing, rich])

  const commit = () => {
    if (skipCommit.current || !dirty.current) {
      skipCommit.current = false
      dirty.current = false
      setEditing(false)
      return
    }
    const next = ref.current ? (rich ? readEditor(ref.current) : ref.current.textContent || '') : value
    dirty.current = false
    setEditing(false)
    if (next !== value) onChange(next)
  }

  if (!editing) {
    return (
      <span
        className={cn('cursor-text rounded-sm', className)}
        onDoubleClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          dirty.current = false
          setEditing(true)
        }}
      >
        {value ? (rich ? <PersonalText text={value} /> : value) : 'Double-click to write'}
      </span>
    )
  }

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      className={cn('cursor-text rounded-sm outline outline-2 outline-sky-400', multiline && 'block whitespace-pre-wrap', className)}
      onBlur={commit}
      onInput={() => {
        if (!seeding.current) dirty.current = true
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Escape') {
          skipCommit.current = true
          setEditing(false)
        } else if (event.key === 'Enter' && !multiline) {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
    />
  )
}

function BlockPreview({ block, font, onChange }: { block: EmailBlock; font?: string; onChange: (fields: Record<string, string>) => void }) {
  const family = fontStack(block.fields.font || font)
  const align = block.fields.align === 'center' ? 'text-center' : block.fields.align === 'right' ? 'text-right' : 'text-left'
  const edit = (key: string, multiline = false, rich = false) => (
    <EditableText value={block.fields[key] || ''} multiline={multiline} rich={rich} onChange={(next) => onChange({ [key]: next })} />
  )
  if (block.type === 'hero') {
    return (
      <div className={cn('bg-[#00044a] px-6 py-7 text-white', align)} style={{ fontFamily: family }}>
        <p className="text-[10px] uppercase tracking-wider text-sky-200">{edit('eyebrow')}</p>
        <p className="mt-1 text-xl">{edit('title', false, true)}</p>
        <p className="mt-1 text-sm text-sky-100">{edit('subtitle', true, true)}</p>
      </div>
    )
  }
  if (block.type === 'heading') return <p className={cn('px-6 pt-4 text-lg font-semibold', align)} style={{ fontFamily: family }}>{edit('text', false, true)}</p>
  if (block.type === 'text') return <p className={cn('whitespace-pre-wrap px-6 pt-3 text-sm leading-6 text-zinc-700', align)} style={{ fontFamily: family }}>{edit('text', true, true)}</p>
  if (block.type === 'image') {
    const width = Math.max(20, Math.min(100, Number(block.fields.width) || 100))
    return block.fields.url ? (
      <div className={cn('px-6 pt-3', align)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={block.fields.url} alt={block.fields.alt} className="inline-block max-h-48 rounded-lg object-contain" style={{ width: `${width}%` }} />
      </div>
    ) : (
      <p className="mx-6 mt-3 rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">Add a picture</p>
    )
  }
  if (block.type === 'button') {
    return (
      <div className={cn('px-6 pt-3', align)} style={{ fontFamily: family }}>
        <span className="inline-block rounded-lg bg-[#00044a] px-3 py-2 text-sm text-white">{edit('label')}</span>
      </div>
    )
  }
  if (block.type === 'offer') {
    return (
      <div className={cn('mx-6 mt-3 rounded-xl border bg-zinc-50 p-3', align)} style={{ fontFamily: family }}>
        <p className="text-[11px] font-semibold text-sky-700 dark:text-sky-600">{edit('price')}</p>
        <p className="font-semibold text-zinc-900">{edit('title', false, true)}</p>
        <p className="text-sm text-zinc-700">{edit('detail', true, true)}</p>
        <span className="mt-2 inline-block rounded-lg bg-sky-600 px-3 py-1.5 text-sm text-white">{edit('buttonLabel')}</span>
      </div>
    )
  }
  if (block.type === 'divider') return <div className="mx-6 mt-4 h-px bg-zinc-200" />
  return <div style={{ height: Number(block.fields.size) || 24 }} />
}

const PERSONAL = [
  { token: '{{name}}', label: "Person's name" },
  { token: '{{company}}', label: 'Company' },
] as const

function PersonalText({ text }: { text: string }) {
  const parts = text.split(/(\{\{name\}\}|\{\{company\}\})/g)
  return (
    <>
      {parts.map((part, index) => {
        const match = PERSONAL.find((item) => item.token === part)
        if (!match) return <span key={index}>{part}</span>
        return (
          <span key={index} className="mx-0.5 inline-flex rounded-md bg-sky-100 px-1.5 py-0.5 align-baseline text-[11px] font-medium text-sky-800">
            {match.label}
          </span>
        )
      })}
    </>
  )
}

function chipElement(token: string, label: string) {
  const chip = document.createElement('span')
  chip.contentEditable = 'false'
  chip.dataset.token = token
  chip.textContent = label
  chip.className = 'mx-0.5 inline-flex rounded-md bg-sky-100 px-1.5 py-0.5 align-baseline text-[11px] font-medium text-sky-800'
  return chip
}

function writeEditor(root: HTMLElement, value: string) {
  root.replaceChildren()
  value.split(/(\{\{name\}\}|\{\{company\}\})/g).forEach((part) => {
    const match = PERSONAL.find((item) => item.token === part)
    if (match) {
      root.append(chipElement(match.token, match.label))
      return
    }
    part.split('\n').forEach((line, index) => {
      if (index) root.append(document.createElement('br'))
      if (line) root.append(document.createTextNode(line))
    })
  })
}

function readEditor(root: HTMLElement) {
  let text = ''
  const walk = (node: Node, atRoot: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || ''
      return
    }
    if (node instanceof HTMLBRElement) {
      text += '\n'
      return
    }
    if (node instanceof HTMLElement && node.dataset.token) {
      text += node.dataset.token
      return
    }
    if (atRoot && node instanceof HTMLDivElement && text && !text.endsWith('\n')) text += '\n'
    node.childNodes.forEach((child) => walk(child, false))
  }
  root.childNodes.forEach((child) => walk(child, true))
  return text.replace(/\u00a0/g, ' ').replace(/\n$/, '')
}

function placeToken(root: HTMLElement, token: string, label: string) {
  root.focus()
  const chip = chipElement(token, label)
  const selection = window.getSelection()
  const inside = selection && selection.rangeCount > 0 && root.contains(selection.anchorNode)
  if (!inside || !selection) {
    root.append(chip)
    return
  }
  const range = selection.getRangeAt(0)
  range.deleteContents()
  range.insertNode(chip)
  range.setStartAfter(chip)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

function FriendlyText({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  multiline?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    const root = ref.current
    if (!root) return
    if (readEditor(root) !== value) writeEditor(root, value)
  }, [value])

  const commit = () => {
    const root = ref.current
    if (!root) return
    const next = readEditor(root)
    if (next !== valueRef.current) onChange(next)
  }

  const insert = (token: string, chipLabel: string) => {
    const root = ref.current
    if (!root) return
    placeToken(root, token, chipLabel)
    commit()
  }

  return (
    <div className="text-[11px]">
      <span className="font-medium text-zinc-600 dark:text-zinc-300">{label}</span>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline={multiline}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        onInput={commit}
        onBlur={commit}
        onKeyDown={(event) => {
          if (!multiline && event.key === 'Enter') event.preventDefault()
        }}
        onPaste={(event) => {
          event.preventDefault()
          const text = event.clipboardData.getData('text/plain')
          const root = ref.current
          if (!root) return
          root.focus()
          const selection = window.getSelection()
          if (!selection || !selection.rangeCount) return
          const range = selection.getRangeAt(0)
          range.deleteContents()
          range.insertNode(document.createTextNode(text))
          range.collapse(false)
          commit()
        }}
        className={cn(
          'mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs text-zinc-900 shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 whitespace-pre-wrap dark:text-zinc-100',
          multiline ? 'min-h-24' : 'min-h-9',
          !value && 'before:text-zinc-400 before:content-[attr(data-placeholder)] dark:before:text-zinc-500'
        )}
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-1 text-zinc-500 dark:text-zinc-400">
        <span>Add</span>
        {PERSONAL.map((item) => (
          <button
            key={item.token}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insert(item.token, item.label)}
            className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[11px] font-medium text-sky-800 hover:bg-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:hover:bg-sky-900"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ChoiceRow({
  label,
  value,
  options,
  onChange,
  fontButtons = false,
}: {
  label: string
  value: string
  options: { id: string; label: string }[]
  onChange: (id: string) => void
  fontButtons?: boolean
}) {
  return (
    <div className="mb-2">
      <p className="mb-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'rounded-md border px-2 py-1 text-[11px]',
              value === option.id
                ? 'border-sky-500 bg-sky-50 text-sky-900 dark:border-sky-400 dark:bg-sky-950 dark:text-sky-100'
                : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800'
            )}
            style={fontButtons ? { fontFamily: fontStack(option.id) } : undefined}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const POSITIONS = [
  { id: 'left', label: 'Left' },
  { id: 'center', label: 'Center' },
  { id: 'right', label: 'Right' },
]

function BlockEditor({
  block,
  font,
  onChange,
  onRemove,
}: {
  block: EmailBlock
  font: string
  onChange: (fields: Record<string, string>) => void
  onRemove: () => void
}) {
  const field = (key: string, label: string, placeholder = '') => (
    <label key={key} className="mb-2 block text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
      {label}
      <Input value={block.fields[key] || ''} placeholder={placeholder} onChange={(event) => onChange({ [key]: event.target.value })} className="mt-1 h-8 text-xs" />
    </label>
  )
  const look = (withFont = true) => (
    <>
      <ChoiceRow label="Position" value={block.fields.align || 'left'} options={POSITIONS} onChange={(align) => onChange({ align })} />
      {withFont && (
        <ChoiceRow
          label="Font"
          value={block.fields.font || font}
          options={EMAIL_FONTS.map((item) => ({ id: item.id, label: item.label }))}
          onChange={(next) => onChange({ font: next })}
          fontButtons
        />
      )}
    </>
  )
  const readPicture = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast('Choose a picture file')
      return
    }
    if (file.size > 400_000) {
      toast('That picture is too large', { description: 'Use one under 400 KB, or paste a web address.' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') onChange({ url: reader.result })
    }
    reader.readAsDataURL(file)
  }
  return (
    <div>
      {block.type === 'hero' && (
        <>
          {look()}
          {field('eyebrow', 'Small label')}
          <FriendlyText label="Headline" value={block.fields.title || ''} onChange={(title) => onChange({ title })} placeholder="Main headline" />
          <FriendlyText label="Supporting line" value={block.fields.subtitle || ''} onChange={(subtitle) => onChange({ subtitle })} placeholder="A short line under the headline" multiline />
        </>
      )}
      {block.type === 'heading' && (
        <>
          {look()}
          <FriendlyText label="Heading" value={block.fields.text || ''} onChange={(text) => onChange({ text })} placeholder="Section title" />
          {field('link', 'Link', 'https://')}
        </>
      )}
      {block.type === 'text' && (
        <>
          {look()}
          <FriendlyText
            label="Message"
            value={block.fields.text || ''}
            onChange={(text) => onChange({ text })}
            placeholder="Write what you want to say"
            multiline
          />
          {field('link', 'Link', 'https://')}
        </>
      )}
      {block.type === 'image' && (
        <>
          {look(false)}
          <label className="mb-2 block text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
            Picture
            <input
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-xs text-zinc-700 dark:text-zinc-200"
              onChange={(event) => {
                readPicture(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </label>
          {block.fields.url?.startsWith('data:') ? (
            <p className="mb-2 text-[11px] text-emerald-700">Picture added from your computer.</p>
          ) : (
            field('url', 'Or paste a web address', 'https://')
          )}
          {field('link', 'Open this page when clicked', 'https://')}
          <label className="mb-2 block text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
            Size · {Math.max(20, Math.min(100, Number(block.fields.width) || 100))}%
            <input
              type="range"
              min={20}
              max={100}
              value={Math.max(20, Math.min(100, Number(block.fields.width) || 100))}
              onChange={(event) => onChange({ width: event.target.value })}
              className="mt-1 w-full"
            />
          </label>
          {field('alt', 'Description for people who cannot see it')}
        </>
      )}
      {block.type === 'button' && (
        <>
          {look()}
          {field('label', 'Label')}
          {field('url', 'Link', 'https://')}
        </>
      )}
      {block.type === 'offer' && (
        <>
          {look()}
          {field('price', 'Price or badge')}
          <FriendlyText label="Title" value={block.fields.title || ''} onChange={(title) => onChange({ title })} placeholder="Offer name" />
          <FriendlyText label="Details" value={block.fields.detail || ''} onChange={(detail) => onChange({ detail })} placeholder="What is included" multiline />
          {field('buttonLabel', 'Button label')}
          {field('buttonUrl', 'Button link', 'https://')}
        </>
      )}
      {block.type === 'spacer' && field('size', 'Height in pixels')}
      {block.type === 'divider' && <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">A thin line between sections.</p>}
      <Button type="button" variant="outline" size="sm" className="mt-1 text-red-600" onClick={onRemove}>
        <Trash2 className="size-3.5" />
        Remove block
      </Button>
    </div>
  )
}
