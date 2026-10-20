'use client'

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { flushSync } from 'react-dom'
import {
  ChevronDown,
  ChevronUp,
  Mail,
  MapPin,
  Minus,
  Phone,
  Plus,
  Pencil,
  Share2,
  Trash2,
  Users,
  Video,
  HeartHandshake,
  FileText,
  MessageCircle,
  Loader2,
  UserPlus,
  RefreshCw,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { SidebarInset } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DashboardViewTabs } from '@/components/dashboard/dashboard-view-tabs'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const STORAGE_KEY = 'petrosphere-performance-board-v1'
const BOARD_ROW_ID = 'board'

const PIPELINE_STATUSES = [
  'Lead In',
  'Contact Made',
  'Needs Defined',
  'Proposal Sent',
  'Negotiation Started',
  'For Follow up',
  'Closed Win',
  'Closed Lost',
]

const TASKS = [
  { name: 'Cold call', icon: Phone },
  { name: 'Email blast', icon: Mail },
  { name: 'Follow-up', icon: MessageCircle },
  { name: 'Site visit', icon: MapPin },
  { name: 'Proposal', icon: FileText },
  { name: 'Webinar', icon: Video },
  { name: 'Social outreach', icon: Share2 },
  { name: 'Nurture check-in', icon: HeartHandshake },
] as const

const LAYER_COLORS = ['#38bdf8', '#3b82f6', '#6366f1', '#4f46e5', '#1d4ed8', '#1e3a8a', '#00044a', '#0f172a']

function funnelClip(topWidth: number, bottomWidth: number) {
  const width = 220
  const height = 56
  const radius = 7
  const points = [
    { x: ((100 - topWidth) / 2 / 100) * width, y: 0 },
    { x: ((100 + topWidth) / 2 / 100) * width, y: 0 },
    { x: ((100 + bottomWidth) / 2 / 100) * width, y: height },
    { x: ((100 - bottomWidth) / 2 / 100) * width, y: height },
  ]
  const rounded: { x: number; y: number }[] = []
  for (let index = 0; index < points.length; index++) {
    const previous = points[(index + points.length - 1) % points.length]
    const current = points[index]
    const next = points[(index + 1) % points.length]
    const toPrevious = { x: previous.x - current.x, y: previous.y - current.y }
    const toNext = { x: next.x - current.x, y: next.y - current.y }
    const previousLength = Math.hypot(toPrevious.x, toPrevious.y) || 1
    const nextLength = Math.hypot(toNext.x, toNext.y) || 1
    const cut = Math.min(radius, previousLength * 0.4, nextLength * 0.4)
    const start = {
      x: current.x + (toPrevious.x / previousLength) * cut,
      y: current.y + (toPrevious.y / previousLength) * cut,
    }
    const end = {
      x: current.x + (toNext.x / nextLength) * cut,
      y: current.y + (toNext.y / nextLength) * cut,
    }
    for (const t of [0, 0.35, 0.65, 1]) {
      const remain = 1 - t
      rounded.push({
        x: remain * remain * start.x + 2 * remain * t * current.x + t * t * end.x,
        y: remain * remain * start.y + 2 * remain * t * current.y + t * t * end.y,
      })
    }
  }
  return `polygon(${rounded.map((point) => `${(point.x / width) * 100}% ${(point.y / height) * 100}%`).join(', ')})`
}

type Period = string

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function parseLocalDate(value: string) {
  return new Date(value.length === 10 ? `${value}T00:00:00` : value)
}

function startOfWeek(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  const day = (next.getDay() + 6) % 7
  next.setDate(next.getDate() - day)
  return next
}

function endOfWeek(date: Date) {
  const next = startOfWeek(date)
  next.setDate(next.getDate() + 7)
  return next
}

function formatWeekLabel(start: Date) {
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const sameMonth = start.getMonth() === end.getMonth()
  const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const endLabel = end.toLocaleDateString(undefined, sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' })
  const year = end.getFullYear()
  return `Week of ${startLabel}–${endLabel}, ${year}`
}

function formatMonthLabel(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function buildPeriodOptions(now = new Date()) {
  const options: { value: string; label: string; group: string }[] = [
    { value: 'week', label: 'This week', group: 'Weeks' },
    { value: 'week-1', label: 'Last week', group: 'Weeks' },
  ]
  for (let offset = 2; offset <= 7; offset++) {
    const start = startOfWeek(now)
    start.setDate(start.getDate() - offset * 7)
    options.push({ value: `w:${toDateKey(start)}`, label: formatWeekLabel(start), group: 'Weeks' })
  }
  options.push({ value: 'month', label: 'This month', group: 'Months' })
  for (let offset = 1; offset <= 11; offset++) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const value = `m:${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}`
    options.push({ value, label: formatMonthLabel(cursor.getFullYear(), cursor.getMonth()), group: 'Months' })
  }
  options.push(
    { value: 'quarter', label: 'This quarter', group: 'Ranges' },
    { value: 'year', label: 'This year', group: 'Ranges' },
    { value: 'all', label: 'All time', group: 'Ranges' }
  )
  return options
}

const PERIOD_OPTIONS = buildPeriodOptions()

function periodLabel(period: Period) {
  return PERIOD_OPTIONS.find((item) => item.value === period)?.label || period
}

type Layer = {
  id: string
  label: string
  target: number
  statuses: string[]
}

type Achievement = {
  id: string
  user: string
  task: string
  quantity: number
  layerId: string
  note: string
  date: string
}

type Board = {
  updatedAt: number
  layers: Layer[]
  achievements: Achievement[]
  customStatuses: string[]
  addedPeople: string[]
  hiddenPeople: string[]
}

type LeadRow = {
  captured_by: string | null
  status: string | null
  first_contact: string | null
  contact_name: string | null
}

type HistoryRow = {
  changed_by: string | null
  field_changed: string | null
  changed_at: string | null
  new_value: string | null
  old_value: string | null
}

type PersonStat = {
  name: string
  captured: number
  wins: number
  statusUpdates: number
  nurtured: number
  logged: number
  leads: { name: string; status: string }[]
}

function defaultBoard(): Board {
  return {
    updatedAt: 0,
    layers: [
      { id: 'captured', label: 'Captured', target: 40, statuses: ['Lead In'] },
      { id: 'contacted', label: 'Contacted', target: 30, statuses: ['Contact Made', 'For Follow up'] },
      { id: 'qualified', label: 'Qualified', target: 20, statuses: ['Needs Defined', 'Negotiation Started'] },
      { id: 'proposed', label: 'Proposed', target: 12, statuses: ['Proposal Sent'] },
      { id: 'won', label: 'Closed Win', target: 8, statuses: ['Closed Win'] },
    ],
    achievements: [],
    customStatuses: [],
    addedPeople: [],
    hiddenPeople: [],
  }
}

function normalizeBoard(raw: unknown): Board | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Partial<Board>
  if (!Array.isArray(value.layers) || value.layers.length < 2) return null
  const layers = value.layers.slice(0, 8).map((layer, index) => {
    const item = layer as Partial<Layer>
    return {
      id: String(item.id || `layer-${index}`),
      label: String(item.label || `Layer ${index + 1}`).slice(0, 40),
      target: Math.max(1, Math.round(Number(item.target) || 10)),
      statuses: Array.isArray(item.statuses) ? item.statuses.map(String) : [],
    }
  })
  const layerIds = new Set(layers.map((layer) => layer.id))
  const achievements = Array.isArray(value.achievements)
    ? value.achievements.flatMap((item) => {
        const row = item as Partial<Achievement>
        if (!row.user || !row.task || !row.layerId || !layerIds.has(String(row.layerId))) return []
        return [
          {
            id: String(row.id || crypto.randomUUID()),
            user: String(row.user),
            task: String(row.task),
            quantity: Math.max(1, Math.min(999, Math.round(Number(row.quantity) || 1))),
            layerId: String(row.layerId),
            note: String(row.note || ''),
            date: String(row.date || new Date().toISOString().slice(0, 10)),
          },
        ]
      })
    : []
  const customStatuses = Array.isArray(value.customStatuses)
    ? value.customStatuses.map((status) => String(status).trim()).filter(Boolean).slice(0, 24)
    : []
  const names = (list: unknown) =>
    Array.isArray(list) ? list.map((item) => String(item).trim()).filter(Boolean).slice(0, 80) : []
  return {
    updatedAt: Number(value.updatedAt) || 0,
    layers,
    achievements,
    customStatuses,
    addedPeople: names(value.addedPeople),
    hiddenPeople: names(value.hiddenPeople),
  }
}

function readLocal(): Board | null {
  try {
    return normalizeBoard(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'))
  } catch {
    return null
  }
}

function inPeriod(value: string | null | undefined, period: Period) {
  if (period === 'all') return true
  if (!value) return false
  const date = parseLocalDate(value)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()

  if (period === 'week' || period === 'week-1') {
    const start = startOfWeek(now)
    if (period === 'week-1') start.setDate(start.getDate() - 7)
    const end = endOfWeek(start)
    return date >= start && date < end
  }
  if (period.startsWith('w:')) {
    const start = parseLocalDate(period.slice(2))
    if (Number.isNaN(start.getTime())) return false
    const end = endOfWeek(start)
    return date >= start && date < end
  }
  if (period === 'month') {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  }
  if (period.startsWith('m:')) {
    const [yearText, monthText] = period.slice(2).split('-')
    const year = Number(yearText)
    const month = Number(monthText)
    if (!year || !month) return false
    return date.getFullYear() === year && date.getMonth() + 1 === month
  }
  if (period === 'year') return date.getFullYear() === now.getFullYear()
  if (period === 'quarter') {
    return date.getFullYear() === now.getFullYear() && Math.floor(date.getMonth() / 3) === Math.floor(now.getMonth() / 3)
  }
  return true
}

function keyOf(name: string) {
  return name.trim().toLowerCase()
}

async function fetchPages<T>(table: 'crm_leads' | 'lead_history' | 'captured_by_settings', columns: string) {
  const pageSize = 1000
  const rows: T[] = []
  for (let from = 0; from < 8000; from += pageSize) {
    const query = supabase.from(table).select(columns).range(from, from + pageSize - 1)
    const { data, error } = await query
    if (error) throw error
    const batch = (data || []) as T[]
    rows.push(...batch)
    if (batch.length < pageSize) break
  }
  return rows
}

export function PerformanceDashboard() {
  const searchParams = useSearchParams()
  const [board, setBoard] = useState<Board>(defaultBoard)
  const [ready, setReady] = useState(false)
  const [sync, setSync] = useState<'checking' | 'team' | 'browser'>('checking')
  const [period, setPeriod] = useState<Period>('month')
  const [selectedLayerId, setSelectedLayerId] = useState('captured')
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [roster, setRoster] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [logHighlight, setLogHighlight] = useState(false)
  const dirty = useRef(false)
  const listRef = useRef<HTMLDivElement>(null)
  const logSectionRef = useRef<HTMLElement>(null)
  const peopleGridRef = useRef<HTMLDivElement>(null)
  const previewIdsRef = useRef<string[] | null>(null)
  const suppressClick = useRef(false)
  const shakeUntilSave = useRef(false)
  const dragRef = useRef<{ pointerId: number; index: number; startY: number; lastSwapY: number; moved: boolean; originIds: string[]; id: string } | null>(null)
  const [previewIds, setPreviewIds] = useState<string[] | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [shaking, setShaking] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editingPeople, setEditingPeople] = useState(false)
  const [personName, setPersonName] = useState('')
  const [enteringPeople, setEnteringPeople] = useState<Set<string>>(new Set())
  const [leavingPeople, setLeavingPeople] = useState<Set<string>>(new Set())
  const seenPeople = useRef(false)
  const previousPeople = useRef<string[]>([])

  const [actor, setActor] = useState('')
  const [task, setTask] = useState<string>(TASKS[0].name)
  const [customTask, setCustomTask] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [activityDate, setActivityDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [customStatus, setCustomStatus] = useState('')
  const [logging, setLogging] = useState(false)

  useEffect(() => {
    let cancel = false
    const load = async () => {
      const local = readLocal()
      let next = local ?? defaultBoard()
      let mode: 'team' | 'browser' = 'browser'
      const { data, error } = await supabase
        .from('performance_board')
        .select('payload, updated_at')
        .eq('id', BOARD_ROW_ID)
        .maybeSingle()
      if (!error && data?.payload) {
        const remote = normalizeBoard(data.payload)
        const remoteAt = data.updated_at ? new Date(data.updated_at).getTime() : remote?.updatedAt || 0
        if (remote && remoteAt >= next.updatedAt && !dirty.current) {
          next = { ...remote, updatedAt: remoteAt }
        }
        mode = 'team'
      }
      if (cancel) return
      setBoard((current) => (dirty.current ? current : next))
      if (!dirty.current) setSelectedLayerId(next.layers[0]?.id ?? '')
      setSync(mode)
      setReady(true)
    }
    load()
    return () => {
      cancel = true
    }
  }, [])

  useEffect(() => {
    let cancel = false
    const loadName = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancel) return
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      const name = profile?.full_name?.trim() || user.user_metadata?.full_name || user.email || ''
      if (!cancel && name) setActor((current) => current || name)
    }
    loadName()
    return () => {
      cancel = true
    }
  }, [])

  useEffect(() => {
    if (selectedPerson) setActor(selectedPerson)
  }, [selectedPerson])

  useEffect(() => {
    if (searchParams.get('log') !== '1') return
    const scrollTimer = window.setTimeout(() => {
      logSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setLogHighlight(true)
      const url = new URL(window.location.href)
      url.searchParams.delete('log')
      window.history.replaceState({}, '', `${url.pathname}${url.search}`)
    }, 180)
    const clearTimer = window.setTimeout(() => setLogHighlight(false), 2800)
    return () => {
      window.clearTimeout(scrollTimer)
      window.clearTimeout(clearTimer)
    }
  }, [searchParams])

  useEffect(() => {
    if (!ready) return
    let cancel = false
    const handle = window.setTimeout(async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(board))
      const { error } = await supabase.from('performance_board').upsert({
        id: BOARD_ROW_ID,
        payload: board,
        updated_at: new Date(board.updatedAt || Date.now()).toISOString(),
      })
      if (cancel) return
      setSync(error ? 'browser' : 'team')
      if (shakeUntilSave.current) {
        shakeUntilSave.current = false
        setShaking(false)
      }
    }, 280)
    return () => {
      cancel = true
      window.clearTimeout(handle)
    }
  }, [board, ready])

  useEffect(() => {
    let cancel = false
    const load = async () => {
      setLoading(true)
      try {
        const [leadRows, historyRows, members] = await Promise.all([
          fetchPages<LeadRow>('crm_leads', 'captured_by, status, first_contact, contact_name'),
          fetchPages<HistoryRow>('lead_history', 'changed_by, field_changed, changed_at, new_value, old_value'),
          fetchPages<{ name: string }>('captured_by_settings', 'name'),
        ])
        if (cancel) return
        setLeads(leadRows)
        setHistory(historyRows)
        setRoster(members.map((member) => member.name).filter(Boolean))
        setLoadError('')
      } catch (error) {
        if (!cancel) setLoadError(error instanceof Error ? error.message : 'Could not load team activity')
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    return () => {
      cancel = true
    }
  }, [])

  const updateBoard = (recipe: (current: Board) => Board) => {
    dirty.current = true
    setBoard((current) => {
      const next = recipe(current)
      return { ...next, updatedAt: Date.now(), layers: next.layers.slice(0, 8) }
    })
  }

  const periodLeads = useMemo(
    () => leads.filter((lead) => inPeriod(lead.first_contact, period)),
    [leads, period]
  )
  const periodHistory = useMemo(
    () => history.filter((row) => inPeriod(row.changed_at, period) && keyOf(row.changed_by || '') !== 'crm automation'),
    [history, period]
  )
  const periodAchievements = useMemo(
    () => board.achievements.filter((item) => inPeriod(item.date, period)),
    [board.achievements, period]
  )

  const people = useMemo(() => {
    const names = new Map<string, string>()
    const remember = (name?: string | null) => {
      const clean = name?.trim()
      if (!clean || keyOf(clean) === 'crm automation') return
      const key = keyOf(clean)
      if (!names.has(key)) names.set(key, clean)
    }
    roster.forEach(remember)
    board.addedPeople.forEach(remember)
    periodLeads.forEach((lead) => remember(lead.captured_by))
    periodHistory.forEach((row) => remember(row.changed_by))
    periodAchievements.forEach((item) => remember(item.user))
    const hidden = new Set(board.hiddenPeople.map((name) => keyOf(name)))

    const stats: PersonStat[] = [...names.entries()]
      .filter(([key]) => !hidden.has(key))
      .map(([key, name]) => {
      const owned = periodLeads.filter((lead) => keyOf(lead.captured_by || '') === key)
      const moves = periodHistory.filter((row) => keyOf(row.changed_by || '') === key && row.field_changed === 'status')
      const nurtures = periodHistory.filter((row) => keyOf(row.changed_by || '') === key && row.field_changed === 'last_contact')
      const logged = periodAchievements
        .filter((item) => keyOf(item.user) === key)
        .reduce((sum, item) => sum + item.quantity, 0)
      return {
        name,
        captured: owned.length,
        wins: owned.filter((lead) => keyOf(lead.status || '') === 'closed win').length,
        statusUpdates: moves.length,
        nurtured: nurtures.length,
        logged,
        leads: owned.slice(0, 6).map((lead) => ({
          name: lead.contact_name?.trim() || 'Unnamed lead',
          status: lead.status || 'No status',
        })),
      }
    })

    return stats.sort((a, b) => {
      const score = (person: PersonStat) => person.captured + person.wins * 2 + person.statusUpdates + person.nurtured + person.logged
      return score(b) - score(a) || a.name.localeCompare(b.name)
    })
  }, [board.addedPeople, board.hiddenPeople, periodAchievements, periodHistory, periodLeads, roster])

  useEffect(() => {
    const keys = people.map((person) => keyOf(person.name))
    if (!seenPeople.current) {
      seenPeople.current = true
      previousPeople.current = keys
      return
    }
    const previous = new Set(previousPeople.current)
    const fresh = keys.filter((key) => !previous.has(key))
    previousPeople.current = keys
    if (!fresh.length) return
    setEnteringPeople(new Set(fresh))
    const timer = window.setTimeout(() => setEnteringPeople(new Set()), 420)
    return () => window.clearTimeout(timer)
  }, [people])

  const focusKey = selectedPerson ? keyOf(selectedPerson) : null

  const layers = useMemo(() => {
    return board.layers.map((layer, index) => {
      const statusSet = new Set(layer.statuses.map((status) => keyOf(status)))
      const live = periodLeads.filter((lead) => {
        if (!statusSet.has(keyOf(lead.status || ''))) return false
        if (!focusKey) return true
        return keyOf(lead.captured_by || '') === focusKey
      }).length
      const logged = periodAchievements
        .filter((item) => item.layerId === layer.id && (!focusKey || keyOf(item.user) === focusKey))
        .reduce((sum, item) => sum + item.quantity, 0)
      const total = live + logged
      return {
        ...layer,
        index,
        color: LAYER_COLORS[index % LAYER_COLORS.length],
        live,
        logged,
        total,
        ratio: Math.max(0, Math.min(1, total / Math.max(1, layer.target))),
      }
    })
  }, [board.layers, focusKey, periodAchievements, periodLeads])

  const orderedLayers = useMemo(() => {
    if (!previewIds) return layers
    const byId = new Map(layers.map((layer) => [layer.id, layer]))
    return previewIds.flatMap((id, index) => {
      const layer = byId.get(id)
      if (!layer) return []
      return [{ ...layer, index, color: LAYER_COLORS[index % LAYER_COLORS.length] }]
    })
  }, [layers, previewIds])

  const beginReorderSave = () => {
    shakeUntilSave.current = true
    setShaking(true)
  }

  const flipPeople = (apply: () => void) => {
    const root = peopleGridRef.current
    const before = new Map<string, { x: number; y: number }>()
    root?.querySelectorAll<HTMLElement>('[data-person]').forEach((node) => {
      const id = node.dataset.person
      if (!id) return
      const rect = node.getBoundingClientRect()
      before.set(id, { x: rect.left, y: rect.top })
    })
    flushSync(() => {
      apply()
    })
    root?.querySelectorAll<HTMLElement>('[data-person]').forEach((node) => {
      const id = node.dataset.person
      const previous = id ? before.get(id) : undefined
      if (!previous) return
      const rect = node.getBoundingClientRect()
      const dx = previous.x - rect.left
      const dy = previous.y - rect.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      node.style.transition = 'none'
      node.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
    })
    requestAnimationFrame(() => {
      root?.querySelectorAll<HTMLElement>('[data-person]').forEach((node) => {
        if (!node.style.transform) return
        node.style.transition = 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)'
        node.style.transform = 'translate3d(0, 0, 0)'
        const clear = () => {
          node.style.transition = ''
          node.style.transform = ''
          node.removeEventListener('transitionend', clear)
        }
        node.addEventListener('transitionend', clear)
      })
    })
  }

  const slideRows = (apply: () => void) => {
    const before = new Map<string, number>()
    listRef.current?.querySelectorAll<HTMLElement>('[data-layer-id]').forEach((row) => {
      const id = row.dataset.layerId
      if (id) before.set(id, row.getBoundingClientRect().top)
    })
    flushSync(() => {
      apply()
    })
    listRef.current?.querySelectorAll<HTMLElement>('[data-layer-id]').forEach((row) => {
      const id = row.dataset.layerId
      const previous = id ? before.get(id) : undefined
      if (previous == null) return
      const delta = previous - row.getBoundingClientRect().top
      if (Math.abs(delta) < 1) return
      row.style.transition = 'none'
      row.style.transform = `translate3d(0, ${delta}px, 0)`
    })
    requestAnimationFrame(() => {
      listRef.current?.querySelectorAll<HTMLElement>('[data-layer-id]').forEach((row) => {
        if (!row.style.transform) return
        row.style.transition = 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1)'
        row.style.transform = 'translate3d(0, 0, 0)'
        const clear = () => {
          row.style.transition = ''
          row.style.transform = ''
          row.removeEventListener('transitionend', clear)
        }
        row.addEventListener('transitionend', clear)
      })
    })
  }

  const announceReorder = (id: string, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    const label = layers.find((layer) => layer.id === id)?.label ?? 'Layer'
    const other = layers[toIndex]?.label
    const direction = toIndex < fromIndex ? 'up' : 'down'
    toast(`${label} moved ${direction}`, {
      description: other ? `Now ${direction === 'up' ? 'above' : 'below'} ${other}` : undefined,
      duration: 2200,
    })
  }

  const onLayerPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, index: number, id: string) => {
    if (!editing || event.button !== 0) return
    dragRef.current = {
      pointerId: event.pointerId,
      index,
      startY: event.clientY,
      lastSwapY: event.clientY,
      moved: false,
      originIds: layers.map((layer) => layer.id),
      id,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onLayerPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId || !listRef.current) return
    const travel = event.clientY - drag.startY
    if (!drag.moved && Math.abs(travel) < 10) return
    if (!drag.moved) {
      drag.moved = true
      drag.lastSwapY = drag.startY
      setDraggingId(drag.id)
    }
    const rows = Array.from(listRef.current.children) as HTMLElement[]
    if (rows.length < 2) return
    const first = rows[0].getBoundingClientRect()
    const second = rows[1].getBoundingClientRect()
    const stride = Math.max(56, second.top - first.top)
    const threshold = stride * 0.85
    const delta = event.clientY - drag.lastSwapY
    if (Math.abs(delta) < threshold) return
    const direction = delta > 0 ? 1 : -1
    const target = drag.index + direction
    if (target < 0 || target >= rows.length) return
    const ids = (previewIdsRef.current ?? drag.originIds).slice()
    const [item] = ids.splice(drag.index, 1)
    ids.splice(target, 0, item)
    drag.index = target
    drag.lastSwapY += direction * threshold
    slideRows(() => {
      previewIdsRef.current = ids
      setPreviewIds(ids)
    })
  }

  const onLayerPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    dragRef.current = null
    const ids = previewIdsRef.current
    previewIdsRef.current = null
    setPreviewIds(null)
    setDraggingId(null)
    if (!drag.moved) {
      setSelectedLayerId(drag.id)
      return
    }
    suppressClick.current = true
    if (!ids || ids.every((id, index) => id === drag.originIds[index])) return
    const fromIndex = drag.originIds.indexOf(drag.id)
    const toIndex = ids.indexOf(drag.id)
    announceReorder(drag.id, fromIndex, toIndex)
    beginReorderSave()
    updateBoard((current) => {
      const byId = new Map(current.layers.map((layer) => [layer.id, layer]))
      return {
        ...current,
        layers: ids.flatMap((id) => {
          const layer = byId.get(id)
          return layer ? [layer] : []
        }),
      }
    })
  }

  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) ?? layers[0]
  const knownStatuses = useMemo(() => {
    const found = new Map<string, string>()
    const remember = (status?: string | null) => {
      const clean = status?.trim()
      if (!clean) return
      const key = keyOf(clean)
      if (!found.has(key)) found.set(key, clean)
    }
    PIPELINE_STATUSES.forEach(remember)
    leads.forEach((lead) => remember(lead.status))
    board.customStatuses.forEach(remember)
    board.layers.forEach((layer) => layer.statuses.forEach(remember))
    return [...found.values()]
  }, [board.customStatuses, board.layers, leads])

  const unassigned = knownStatuses.filter(
    (status) => !board.layers.some((layer) => layer.statuses.some((item) => keyOf(item) === keyOf(status)))
  )

  const taskTotals = useMemo(() => {
    return TASKS.map((item) => {
      const quantityForTask = periodAchievements
        .filter((entry) => entry.task === item.name && (!focusKey || keyOf(entry.user) === focusKey))
        .reduce((sum, entry) => sum + entry.quantity, 0)
      return { ...item, quantity: quantityForTask }
    })
  }, [focusKey, periodAchievements])

  const visibleAchievements = periodAchievements
    .filter((item) => !focusKey || keyOf(item.user) === focusKey)
    .filter((item) => !selectedTask || item.task === selectedTask)
    .filter((item) => !selectedLayer || item.layerId === selectedLayer.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, 12)

  const capturedTotal = focusKey
    ? periodLeads.filter((lead) => keyOf(lead.captured_by || '') === focusKey).length
    : periodLeads.filter((lead) => lead.captured_by?.trim()).length
  const statusTotal = periodHistory.filter((row) => row.field_changed === 'status' && (!focusKey || keyOf(row.changed_by || '') === focusKey)).length
  const nurtureTotal = periodHistory.filter((row) => row.field_changed === 'last_contact' && (!focusKey || keyOf(row.changed_by || '') === focusKey)).length
  const loggedTotal = periodAchievements
    .filter((item) => !focusKey || keyOf(item.user) === focusKey)
    .reduce((sum, item) => sum + item.quantity, 0)

  const logAchievement = (override?: { task?: string; quantity?: number }) => {
    const layer = selectedLayer
    const who = actor.trim()
    if (!layer) {
      toast('Choose a funnel layer first')
      return
    }
    if (!who) {
      toast('Add a name in Who first')
      return
    }
    const nextTask = (override?.task ?? (task === 'Custom' ? customTask : task)).trim()
    if (!nextTask) {
      toast('Choose or type a task')
      return
    }
    const nextQuantity = Math.max(1, Math.min(999, override?.quantity ?? quantity))
    const date = activityDate || new Date().toISOString().slice(0, 10)
    setLogging(true)
    updateBoard((current) => ({
      ...current,
      achievements: [
        {
          id: crypto.randomUUID(),
          user: who,
          task: nextTask,
          quantity: nextQuantity,
          layerId: layer.id,
          note: note.trim(),
          date,
        },
        ...current.achievements,
      ].slice(0, 400),
    }))
    setSelectedTask(nextTask)
    setTask(TASKS.some((item) => item.name === nextTask) ? nextTask : 'Custom')
    if (!TASKS.some((item) => item.name === nextTask)) setCustomTask(nextTask)
    setNote('')
    setQuantity(1)
    const shown = inPeriod(date, period)
    toast(`${nextQuantity} ${nextTask} added to ${layer.label}`, {
      description: shown ? `${who} · ${date}` : `${who} · ${date} · outside ${periodLabel(period)}`,
    })
    window.setTimeout(() => setLogging(false), 280)
  }

  const personOptions = people.map((person) => person.name)

  return (
    <SidebarInset>
      <div className="mb-3">
        <h1 className="text-2xl font-bold tracking-tight">Team performance</h1>
        <p className="text-sm text-muted-foreground">
          Who captured the lead, who moved the status, who nurtured it, and the work logged into the funnel.
        </p>
      </div>
      <Separator className="mb-4" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DashboardViewTabs />
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {sync === 'checking' ? 'Checking save' : sync === 'team' ? 'Shared with the team' : 'Saved in this browser'}
          </span>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-8 w-[200px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {(['Weeks', 'Months', 'Ranges'] as const).map((group) => (
                <div key={group}>
                  <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
                  {PERIOD_OPTIONS.filter((item) => item.group === group).map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {(selectedPerson || selectedTask) && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm dark:border-sky-900 dark:bg-sky-950/40">
          <span>
            Showing{' '}
            <span className="font-semibold">{[selectedPerson, selectedTask].filter(Boolean).join(' · ')}</span>
          </span>
          <button
            type="button"
            className="text-xs font-medium text-sky-700 dark:text-sky-300"
            onClick={() => {
              setSelectedPerson(null)
              setSelectedTask(null)
            }}
          >
            Clear filter
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <Stat label="Captured" value={capturedTotal} hint="Leads with a capturer in this period" icon={UserPlus} tone="sky" />
        <Stat label="Status updates" value={statusTotal} hint="Status changes recorded in lead history" icon={RefreshCw} tone="violet" />
        <Stat label="Nurture touches" value={nurtureTotal} hint="Last-contact updates" icon={HeartHandshake} tone="emerald" />
        <Stat label="Logged work" value={loggedTotal} hint="Calls, blasts, visits, and other achievements" icon={ClipboardList} tone="amber" />
      </div>

      {loadError && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {loadError}
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)] xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="rounded-xl border border-zinc-200 bg-card p-4 shadow-sm dark:border-zinc-800">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Funnel</h2>
              <p className="text-[11px] text-muted-foreground">
                {editing
                  ? 'Drag a layer to reorder it. The funnel stays wide at the top and narrow at the bottom.'
                  : 'Turn on Edit to rename, reorder, or remove layers.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {editing && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs"
                  disabled={board.layers.length >= 8}
                  onClick={() => {
                    const id = crypto.randomUUID()
                    updateBoard((current) => ({
                      ...current,
                      layers: [...current.layers, { id, label: `Layer ${current.layers.length + 1}`, target: 10, statuses: [] }],
                    }))
                    setSelectedLayerId(id)
                  }}
                >
                  <Plus className="size-3.5" />
                  Layer
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-pressed={editing}
                className={cn('h-8 gap-1 text-xs', editing && 'border-transparent bg-[#00044a] text-white hover:bg-[#0a1168] hover:text-white')}
                onClick={() => {
                  dragRef.current = null
                  setDraggingId(null)
                  setEditing((value) => !value)
                }}
              >
                {editing ? 'Done' : (
                  <>
                    <Pencil className="size-3.5" />
                    Edit
                  </>
                )}
              </Button>
            </div>
          </div>

          <div ref={listRef} className={cn('space-y-1.5', shaking && !editing && 'perf-shake')}>
            {orderedLayers.map((layer) => {
              const count = orderedLayers.length
              const top = 100 - (layer.index / count) * 46
              const bottom = 100 - ((layer.index + 1) / count) * 46
              const selected = layer.id === selectedLayer?.id
              const dragging = layer.id === draggingId
              return (
                <div
                  key={layer.id}
                  data-layer-id={layer.id}
                  className={cn(dragging && 'relative z-20')}
                >
                  <div
                    className={cn(
                      'group/layer grid items-center gap-3 sm:grid-cols-[220px_minmax(0,1fr)]',
                      editing && !dragging && 'perf-jiggle',
                      editing && !dragging && layer.index % 2 === 1 && 'perf-jiggle-alt'
                    )}
                    style={editing && !dragging ? { animationDelay: `${(layer.index % 5) * 45}ms` } : undefined}
                  >
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-grabbed={dragging}
                    onPointerDown={(event) => onLayerPointerDown(event, layer.index, layer.id)}
                    onPointerMove={onLayerPointerMove}
                    onPointerUp={onLayerPointerUp}
                    onPointerCancel={onLayerPointerUp}
                    onClick={() => {
                      if (suppressClick.current) {
                        suppressClick.current = false
                        return
                      }
                      setSelectedLayerId(layer.id)
                    }}
                    className={cn(
                      'perf-funnel-bar relative h-14 w-full overflow-hidden rounded-md select-none',
                      editing ? 'cursor-grab touch-none' : 'cursor-pointer',
                      dragging && 'z-20 scale-[1.18] cursor-grabbing shadow-xl',
                      selected && !dragging && 'ring-2 ring-[#00044a] ring-offset-2 ring-offset-background dark:ring-sky-300'
                    )}
                    style={{
                      clipPath: funnelClip(top, bottom),
                      WebkitClipPath: funnelClip(top, bottom),
                      background: 'color-mix(in srgb, var(--color, #3b82f6) 16%, transparent)',
                      ['--color' as string]: layer.color,
                    }}
                  >
                    <span
                      className="perf-fill absolute inset-x-0 bottom-0 overflow-visible"
                      style={{ height: `${Math.max(layer.total > 0 ? 12 : 0, layer.ratio * 100)}%`, color: layer.color }}
                    >
                      <span className="perf-wave" aria-hidden>
                        <Wave />
                        <Wave />
                      </span>
                      <span className="absolute inset-0 bg-current" />
                    </span>
                    <span className="absolute inset-0 z-[1] flex items-center justify-center text-[11px] font-semibold tabular-nums text-zinc-800 transition-transform duration-300 ease-out group-hover/layer:scale-105 dark:text-zinc-100">
                      {Math.round(layer.ratio * 100)}%
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={cn(
                      'flex min-w-0 items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-all duration-300 ease-out',
                      selected
                        ? 'bg-zinc-100 dark:bg-zinc-900'
                        : 'hover:translate-x-0.5 hover:bg-zinc-50 group-hover/layer:bg-zinc-50 dark:hover:bg-zinc-900/60 dark:group-hover/layer:bg-zinc-900/60'
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium transition-colors duration-300 group-hover/layer:text-zinc-950 dark:group-hover/layer:text-white">{layer.label}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {layer.live} from pipeline · {layer.logged} logged · target {layer.target}
                      </span>
                    </span>
                    <span
                      className="size-2.5 shrink-0 rounded-full transition-transform duration-300 ease-out group-hover/layer:scale-125"
                      style={{ background: layer.color }}
                    />
                  </button>
                  </div>
                </div>
              )
            })}
          </div>

          {editing && selectedLayer && (
            <div className="mt-4 grid gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800 md:grid-cols-[1fr_120px_auto]">
              <label className="block text-[11px] text-muted-foreground">
                Layer label
                <Input
                  value={selectedLayer.label}
                  maxLength={40}
                  onChange={(event) => {
                    const label = event.target.value
                    updateBoard((current) => ({
                      ...current,
                      layers: current.layers.map((layer) => (layer.id === selectedLayer.id ? { ...layer, label } : layer)),
                    }))
                  }}
                  className="mt-1 h-9"
                />
              </label>
              <label className="block text-[11px] text-muted-foreground">
                Target
                <Input
                  type="number"
                  min={1}
                  max={9999}
                  value={selectedLayer.target}
                  onChange={(event) => {
                    const target = Math.max(1, Math.min(9999, Math.round(Number(event.target.value) || 1)))
                    updateBoard((current) => ({
                      ...current,
                      layers: current.layers.map((layer) => (layer.id === selectedLayer.id ? { ...layer, target } : layer)),
                    }))
                  }}
                  className="mt-1 h-9"
                />
              </label>
              <div className="flex items-end gap-1">
                <IconButton
                  label="Move layer up"
                  disabled={selectedLayer.index === 0}
                  onClick={() => moveLayer(selectedLayer.index, -1)}
                >
                  <ChevronUp className="size-4" />
                </IconButton>
                <IconButton
                  label="Move layer down"
                  disabled={selectedLayer.index === layers.length - 1}
                  onClick={() => moveLayer(selectedLayer.index, 1)}
                >
                  <ChevronDown className="size-4" />
                </IconButton>
                <IconButton
                  label="Remove layer"
                  disabled={layers.length <= 2}
                  onClick={() => {
                    const fallback = layers[selectedLayer.index === 0 ? 1 : selectedLayer.index - 1]
                    updateBoard((current) => ({
                      ...current,
                      layers: current.layers.filter((layer) => layer.id !== selectedLayer.id),
                      achievements: current.achievements.map((item) =>
                        item.layerId === selectedLayer.id ? { ...item, layerId: fallback.id } : item
                      ),
                    }))
                    setSelectedLayerId(fallback.id)
                  }}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
              <div className="md:col-span-3">
                <p className="mb-1.5 text-[11px] text-muted-foreground">Pipeline statuses that fill this layer</p>
                <div className="flex flex-wrap gap-1.5">
                  {knownStatuses.map((status) => {
                    const on = selectedLayer.statuses.some((item) => keyOf(item) === keyOf(status))
                    const custom =
                      board.customStatuses.some((item) => keyOf(item) === keyOf(status)) &&
                      !PIPELINE_STATUSES.some((item) => keyOf(item) === keyOf(status))
                    const removeCustom = () => {
                      updateBoard((current) => ({
                        ...current,
                        customStatuses: current.customStatuses.filter((item) => keyOf(item) !== keyOf(status)),
                        layers: current.layers.map((layer) => ({
                          ...layer,
                          statuses: layer.statuses.filter((item) => keyOf(item) !== keyOf(status)),
                        })),
                      }))
                    }
                    return (
                      <span key={status} className="inline-flex items-center gap-0.5">
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => {
                            updateBoard((current) => ({
                              ...current,
                              layers: current.layers.map((layer) => {
                                const without = layer.statuses.filter((item) => keyOf(item) !== keyOf(status))
                                if (layer.id === selectedLayer.id) {
                                  return { ...layer, statuses: on ? without : [...without, status] }
                                }
                                return { ...layer, statuses: without }
                              }),
                            }))
                          }}
                          className={cn(
                            'rounded-full border px-2 py-1 text-[11px] transition-colors',
                            on
                              ? 'border-transparent bg-[#00044a] text-white dark:bg-sky-500'
                              : 'border-zinc-200 text-muted-foreground hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900'
                          )}
                        >
                          {status}
                        </button>
                        {custom && (
                          <button
                            type="button"
                            aria-label={`Remove ${status}`}
                            onClick={removeCustom}
                            className="inline-flex size-4 items-center justify-center rounded-full text-[11px] text-muted-foreground hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    )
                  })}
                  <form
                    className="inline-flex items-center gap-1"
                    onSubmit={(event) => {
                      event.preventDefault()
                      const name = customStatus.trim().slice(0, 40)
                      if (!name || !selectedLayer) return
                      const existing = knownStatuses.find((status) => keyOf(status) === keyOf(name))
                      const label = existing || name
                      updateBoard((current) => ({
                        ...current,
                        customStatuses: existing
                          ? current.customStatuses
                          : [...current.customStatuses.filter((status) => keyOf(status) !== keyOf(label)), label],
                        layers: current.layers.map((layer) => {
                          const without = layer.statuses.filter((item) => keyOf(item) !== keyOf(label))
                          if (layer.id !== selectedLayer.id) return { ...layer, statuses: without }
                          return { ...layer, statuses: [...without, label] }
                        }),
                      }))
                      setCustomStatus('')
                    }}
                  >
                    <Input
                      value={customStatus}
                      maxLength={40}
                      onChange={(event) => setCustomStatus(event.target.value)}
                      placeholder="Custom status"
                      aria-label="Custom status"
                      className="h-7 w-32 text-[11px]"
                    />
                    <Button type="submit" size="sm" variant="outline" className="h-7 px-2 text-[11px]" disabled={!customStatus.trim()}>
                      Add
                    </Button>
                  </form>
                </div>
                {unassigned.length > 0 && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Still outside the funnel: {unassigned.join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        <section
          ref={logSectionRef}
          id="log-achievement"
          className={cn(
            'scroll-mt-20 rounded-xl border border-zinc-200 bg-card p-4 shadow-sm transition-shadow duration-500 dark:border-zinc-800',
            logHighlight && 'ring-2 ring-amber-400 shadow-amber-200/50 dark:ring-amber-500 dark:shadow-amber-900/40'
          )}
        >
          <h2 className="text-sm font-semibold">Log an achievement</h2>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Tap a task to add 1, or fill the form and press Add. Counts pour into the selected funnel layer.
          </p>
          <label className="mb-3 block text-[11px] text-muted-foreground">
            Pour into layer
            <Select value={selectedLayer?.id || ''} onValueChange={setSelectedLayerId}>
              <SelectTrigger className="mt-1 h-9 text-xs">
                <SelectValue placeholder="Choose a layer" />
              </SelectTrigger>
              <SelectContent>
                {layers.map((layer) => (
                  <SelectItem key={layer.id} value={layer.id}>
                    {layer.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {taskTotals.map((item) => {
              const Icon = item.icon
              const active = task === item.name
              return (
                <button
                  key={item.name}
                  type="button"
                  aria-pressed={active}
                  title={actor.trim() ? `Add 1 ${item.name}` : 'Add a name in Who first'}
                  onClick={() => {
                    setTask(item.name)
                    setSelectedTask(item.name)
                    if (!actor.trim()) {
                      toast('Add a name in Who first')
                      return
                    }
                    logAchievement({ task: item.name, quantity: 1 })
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-all duration-200',
                    active
                      ? 'border-transparent bg-[#00044a] text-white shadow-sm dark:bg-sky-500'
                      : 'border-zinc-200 hover:scale-[1.03] hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900',
                    logging && active && 'scale-105'
                  )}
                >
                  <Icon className="size-3" />
                  {item.name}
                  <span className={cn('tabular-nums', active ? 'text-white/80' : 'text-muted-foreground')}>{item.quantity}</span>
                </button>
              )
            })}
          </div>

          <div className="grid gap-2">
            <label className="text-[11px] text-muted-foreground">
              Who
              <Input
                list="performance-people"
                value={actor}
                onChange={(event) => setActor(event.target.value)}
                placeholder="Team member"
                className="mt-1 h-9"
              />
              <datalist id="performance-people">
                {personOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
            <label className="text-[11px] text-muted-foreground">
              Custom task
              <Input
                value={customTask}
                onChange={(event) => {
                  setCustomTask(event.target.value)
                  setTask('Custom')
                  setSelectedTask(null)
                }}
                placeholder="Or type a task that is not listed"
                className="mt-1 h-9"
              />
            </label>
            <div className="grid grid-cols-[1fr_140px] gap-2">
              <label className="text-[11px] text-muted-foreground">
                Count
                <div className="mt-1 flex h-9 items-center rounded-md border border-input">
                  <button type="button" className="px-2" aria-label="Decrease count" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>
                    <Minus className="size-3.5" />
                  </button>
                  <span className="flex-1 text-center text-sm tabular-nums">{quantity}</span>
                  <button type="button" className="px-2" aria-label="Increase count" onClick={() => setQuantity((value) => Math.min(999, value + 1))}>
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </label>
              <label className="text-[11px] text-muted-foreground">
                Date
                <Input type="date" value={activityDate} onChange={(event) => setActivityDate(event.target.value)} className="mt-1 h-9" />
              </label>
            </div>
            <label className="text-[11px] text-muted-foreground">
              Note
              <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional detail" className="mt-1 h-9" />
            </label>
            <Button
              type="button"
              className="bg-[#00044a] text-white hover:bg-[#0a1168]"
              disabled={!selectedLayer}
              onClick={() => logAchievement()}
            >
              {logging ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Add to {selectedLayer?.label || 'layer'}
            </Button>
          </div>

          <div className="mt-4 space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-muted-foreground">
                Recent · {selectedLayer?.label || 'layer'}
                {selectedTask ? ` · ${selectedTask}` : ''}
              </p>
              {selectedTask && (
                <button type="button" className="text-[11px] text-sky-700 dark:text-sky-300" onClick={() => setSelectedTask(null)}>
                  Show all tasks
                </button>
              )}
            </div>
            {visibleAchievements.length === 0 && (
              <p className="text-xs text-muted-foreground">No achievements in this view yet. Tap a task above to log one.</p>
            )}
            {visibleAchievements.map((item) => {
              const layer = board.layers.find((entry) => entry.id === item.layerId)
              return (
                <div key={item.id} className="flex items-start justify-between gap-2 rounded-lg px-1 py-1 text-xs transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {item.user} · {item.quantity} {item.task}
                    </p>
                    <p className="truncate text-muted-foreground">
                      {layer?.label || 'Layer'} · {item.date}
                      {item.note ? ` · ${item.note}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove achievement"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      updateBoard((current) => ({
                        ...current,
                        achievements: current.achievements.filter((entry) => entry.id !== item.id),
                      }))
                      toast('Achievement removed')
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <section className="mt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Everyone</h2>
            {loading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'grid transition-[grid-template-columns,opacity] duration-300 ease-out',
                editingPeople ? 'grid-cols-[1fr] opacity-100' : 'pointer-events-none grid-cols-[0fr] opacity-0'
              )}
            >
              <form
                className="flex min-w-0 items-center gap-1 overflow-hidden"
                onSubmit={(event) => {
                  event.preventDefault()
                  const name = personName.trim().slice(0, 40)
                  if (!name || keyOf(name) === 'crm automation') return
                  const key = keyOf(name)
                  flipPeople(() => {
                    setEnteringPeople((current) => new Set(current).add(key))
                    updateBoard((current) => ({
                      ...current,
                      hiddenPeople: current.hiddenPeople.filter((item) => keyOf(item) !== key),
                      addedPeople: current.addedPeople.some((item) => keyOf(item) === key)
                        ? current.addedPeople
                        : [...current.addedPeople, name],
                    }))
                    setPersonName('')
                  })
                }}
              >
                <Input
                  value={personName}
                  maxLength={40}
                  onChange={(event) => setPersonName(event.target.value)}
                  placeholder="Add person"
                  aria-label="Add person"
                  className="h-8 w-36 text-xs"
                />
                <Button type="submit" size="sm" variant="outline" className="h-8 px-2 text-xs" disabled={!personName.trim()}>
                  Add
                </Button>
              </form>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-pressed={editingPeople}
              className={cn('h-8 gap-1 text-xs', editingPeople && 'border-transparent bg-[#00044a] text-white hover:bg-[#0a1168] hover:text-white')}
              onClick={() => setEditingPeople((value) => !value)}
            >
              {editingPeople ? 'Done' : (
                <>
                  <Pencil className="size-3.5" />
                  Edit
                </>
              )}
            </Button>
          </div>
        </div>
        <div ref={peopleGridRef} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {people.map((person, index) => {
            const personKey = keyOf(person.name)
            const active = selectedPerson === person.name
            const leaving = leavingPeople.has(personKey)
            const max = Math.max(1, ...people.map((item) => item.captured + item.statusUpdates + item.nurtured + item.logged))
            const width = ((person.captured + person.statusUpdates + person.nurtured + person.logged) / max) * 100
            return (
              <div
                key={person.name}
                data-person={personKey}
                className={cn(
                  'relative',
                  enteringPeople.has(personKey) && 'perf-person-enter',
                  leaving && 'perf-person-leave'
                )}
              >
                <div
                  className={cn(
                    editingPeople && !leaving && 'perf-jiggle',
                    editingPeople && !leaving && index % 2 === 1 && 'perf-jiggle-alt'
                  )}
                  style={editingPeople && !leaving ? { animationDelay: `${(index % 5) * 45}ms` } : undefined}
                >
                <button
                  type="button"
                  aria-label={`Remove ${person.name}`}
                  disabled={!editingPeople || leaving}
                  onClick={() => {
                    if (leavingPeople.has(personKey)) return
                    setLeavingPeople((current) => new Set(current).add(personKey))
                    window.setTimeout(() => {
                      flipPeople(() => {
                        updateBoard((current) => ({
                          ...current,
                          addedPeople: current.addedPeople.filter((item) => keyOf(item) !== personKey),
                          hiddenPeople: current.hiddenPeople.some((item) => keyOf(item) === personKey)
                            ? current.hiddenPeople
                            : [...current.hiddenPeople, person.name],
                        }))
                        setLeavingPeople((current) => {
                          const next = new Set(current)
                          next.delete(personKey)
                          return next
                        })
                        if (keyOf(selectedPerson || '') === personKey) setSelectedPerson(null)
                      })
                    }, 220)
                  }}
                  className={cn(
                    'absolute -left-1.5 -top-1.5 z-10 flex size-5 items-center justify-center rounded-full bg-zinc-500 text-white shadow-sm transition-[transform,opacity] duration-200 hover:bg-zinc-700',
                    editingPeople ? 'scale-100 opacity-100' : 'pointer-events-none scale-0 opacity-0'
                  )}
                >
                  <Minus className="size-3" />
                </button>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    if (editingPeople || leaving) return
                    setSelectedPerson((current) => (current === person.name ? null : person.name))
                    setActor(person.name)
                  }}
                  className={cn(
                    'w-full rounded-xl border bg-card p-3 text-left shadow-sm transition-[border-color,transform,box-shadow] duration-300',
                    active ? 'border-[#00044a] dark:border-sky-400' : 'border-zinc-200 dark:border-zinc-800',
                    !editingPeople && !leaving && 'hover:-translate-y-0.5'
                  )}
                >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-full bg-[#00044a] text-[11px] font-semibold text-white">
                      {initials(person.name)}
                    </span>
                    <span className="text-sm font-semibold">{person.name}</span>
                  </span>
                  {person.wins > 0 && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      {person.wins} win{person.wins === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-4 gap-1 text-center">
                  <Mini label="Captured" value={person.captured} />
                  <Mini label="Moved" value={person.statusUpdates} />
                  <Mini label="Nurtured" value={person.nurtured} />
                  <Mini label="Logged" value={person.logged} />
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
                  <div className="h-full rounded-full bg-[#00044a] transition-[width] duration-700 ease-out dark:bg-sky-400" style={{ width: `${width}%` }} />
                </div>
                <div
                  className={cn(
                    'grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out',
                    active && person.leads.length > 0 ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  )}
                >
                  <div className="overflow-hidden">
                    <ul className="space-y-1 border-t border-zinc-200 pt-2 text-[11px] dark:border-zinc-800">
                      {person.leads.map((lead, leadIndex) => (
                        <li key={`${lead.name}-${leadIndex}`} className="flex justify-between gap-2">
                          <span className="truncate">{lead.name}</span>
                          <span className="shrink-0 text-muted-foreground">{lead.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </button>
                </div>
              </div>
            )
          })}
          {!loading && people.length === 0 && (
            <p className="text-sm text-muted-foreground">No capturers or history in this period yet.</p>
          )}
        </div>
      </section>

      <style jsx global>{`
        .perf-fill {
          transition: height 700ms cubic-bezier(0.22, 1, 0.36, 1);
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
        }
        .perf-funnel-bar {
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
          transition:
            clip-path 320ms cubic-bezier(0.22, 1, 0.36, 1),
            -webkit-clip-path 320ms cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 320ms ease,
            filter 320ms ease,
            background 320ms ease;
        }
        @media (hover: hover) and (pointer: fine) {
          .perf-funnel-bar:hover:not(:active) {
            z-index: 10;
            background: color-mix(in srgb, var(--color, #3b82f6) 28%, transparent);
            box-shadow: 0 10px 24px -12px color-mix(in srgb, var(--color, #3b82f6) 70%, transparent);
            filter: brightness(1.06) saturate(1.08);
            transform: translateZ(0) scale(1.045);
          }
          .perf-funnel-bar:hover:not(:active) .perf-fill {
            filter: brightness(1.08);
          }
          .group\\/layer:hover .perf-funnel-bar:not(:active) {
            background: color-mix(in srgb, var(--color, #3b82f6) 24%, transparent);
          }
        }
        .perf-wave {
          position: absolute;
          top: -14px;
          left: 0;
          z-index: 1;
          display: flex;
          width: 200%;
          height: 22px;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          -webkit-animation: perf-wave 3.6s linear infinite;
          animation: perf-wave 3.6s linear infinite;
          will-change: left;
        }
        @-webkit-keyframes perf-wave {
          from { left: 0; }
          to { left: -50%; }
        }
        @keyframes perf-wave {
          from { left: 0; }
          to { left: -50%; }
        }
        @keyframes perf-shake {
          0%, 100% { transform: translate3d(0, 0, 0); }
          20% { transform: translate3d(-4px, 0, 0); }
          40% { transform: translate3d(4px, 0, 0); }
          60% { transform: translate3d(-3px, 0, 0); }
          80% { transform: translate3d(3px, 0, 0); }
        }
        .perf-shake {
          animation: perf-shake 0.42s ease-in-out infinite;
        }
        @keyframes perf-jiggle {
          0% { transform: rotate(-0.4deg); }
          50% { transform: rotate(0.4deg); }
          100% { transform: rotate(-0.4deg); }
        }
        .perf-jiggle {
          animation-name: perf-jiggle;
          animation-duration: 0.45s;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          transform-origin: center center;
        }
        .perf-jiggle-alt {
          animation-direction: reverse;
        }
        @keyframes perf-person-in {
          from { opacity: 0; transform: translate3d(0, 12px, 0) scale(0.96); }
          to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes perf-person-out {
          to { opacity: 0; transform: scale(0.92); }
        }
        .perf-person-enter {
          animation: perf-person-in 420ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .perf-person-leave {
          animation: perf-person-out 220ms ease forwards;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .perf-wave {
            -webkit-animation: none;
            animation: none;
            left: 0;
          }
          .perf-fill { transition: none; }
          .perf-funnel-bar { transition: none; }
          .perf-funnel-bar:hover:not(:active) { transform: translateZ(0); filter: none; box-shadow: none; }
          .perf-shake { animation: none; }
          .perf-jiggle { animation: none; }
          .perf-person-enter, .perf-person-leave { animation: none; }
        }
      `}</style>
    </SidebarInset>
  )

  function moveLayer(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= layers.length) return
    const ids = layers.map((layer) => layer.id)
    const [item] = ids.splice(index, 1)
    ids.splice(target, 0, item)
    announceReorder(item, index, target)
    beginReorderSave()
    slideRows(() => {
      updateBoard((current) => {
        const byId = new Map(current.layers.map((layer) => [layer.id, layer]))
        return {
          ...current,
          layers: ids.flatMap((id) => {
            const layer = byId.get(id)
            return layer ? [layer] : []
          }),
        }
      })
    })
  }
}

const STAT_TONES = {
  sky: {
    card: 'border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40',
    icon: 'bg-sky-500 text-white',
    value: 'text-sky-700 dark:text-sky-300',
  },
  violet: {
    card: 'border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/40',
    icon: 'bg-violet-500 text-white',
    value: 'text-violet-700 dark:text-violet-300',
  },
  emerald: {
    card: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40',
    icon: 'bg-emerald-500 text-white',
    value: 'text-emerald-700 dark:text-emerald-300',
  },
  amber: {
    card: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40',
    icon: 'bg-amber-500 text-white',
    value: 'text-amber-700 dark:text-amber-300',
  },
} as const

function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  hint: string
  icon: LucideIcon
  tone: keyof typeof STAT_TONES
}) {
  const colors = STAT_TONES[tone]
  return (
    <div title={hint} className={cn('flex items-center gap-2 rounded-lg border px-2.5 py-1.5', colors.card)}>
      <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', colors.icon)}>
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-medium text-muted-foreground">{label}</span>
        <span className={cn('block text-lg font-bold tabular-nums leading-none', colors.value)}>{value.toLocaleString()}</span>
      </span>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <span className="block text-sm font-semibold tabular-nums">{value}</span>
      <span className="block text-[10px] text-muted-foreground">{label}</span>
    </span>
  )
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-9 items-center justify-center rounded-md border border-zinc-200 text-muted-foreground hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-900"
    >
      {children}
    </button>
  )
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function Wave() {
  return (
    <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className="h-[22px] w-1/2 shrink-0" aria-hidden>
      <path
        d="M0 24C100 8 200 40 300 24C400 8 500 40 600 24C700 8 800 40 900 24C1000 8 1100 40 1200 24V40H0Z"
        fill="currentColor"
      />
    </svg>
  )
}
