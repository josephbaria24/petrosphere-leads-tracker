'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts'

const shortLabelMap: Record<string, string> = {
  email: 'Email',
  inbound___email: 'I-Email',
  inbound___existing_client: 'I-Existing Client',
  outbound___email: 'O-Email',
  inbound___facebook: 'I-FB',
  outbound___facebook: 'O-FB',
  inbound___tawkto: 'I-Tawk.to',
  inbound___webinar: 'I-Webinar',
  outbound___google_search__data_mining_: 'O-Google',
  phone_call: 'Call',
  outbound___phone_call: 'O-Phone Call',
  inbound___phone_call: 'I-Phone Call',
  phone_text: 'Text',
  inbound___phone_text: 'I-Text',
  inbound___linkedin: 'I-LinkedIn',
  inbound___website_inquiry: 'I-Website',
  inbound___viber: 'I-Viber',
  outbound___phone_text: 'O-Phone Text',
  outbound___linkedin: 'O-LinkedIn',
  inbound___office_visit: 'I-Office Visit',
  inbound___webinar__petros_: 'I-Webinar',
  site_visit: 'Visit',
  outbound___site___client_visit: 'O-Visit',
  unknown: 'Unknown',
  viber: 'Viber',
}

const COLORS = [
  '#d6a800',
  '#42a5f5',
  '#d6000e',
  '#66bb6a',
  '#ab47bc',
  '#fc0303',
  '#ffa726',
  '#8d6e63',
  '#f200ff',
  '#590000',
  '#008a37',
]

const DAY = 86_400_000

type Grain = 'year' | 'quarter' | 'month' | 'week' | 'day'

const GRAIN_LABEL: Record<Grain, string> = {
  year: 'Year',
  quarter: 'Quarter',
  month: 'Month',
  week: 'Week',
  day: 'Day',
}

type AreaData = {
  date: string
  [leadSource: string]: string | number
}

export type LeadCapturePoint = {
  t: number
  source: string
}

type TimeView = { start: number; end: number }

function parseLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return new Date(value).getTime()
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime()
}

function grainForSpan(span: number, previous?: Grain): Grain {
  const days = span / DAY
  const pick = (value: number): Grain => {
    if (value > 900) return 'year'
    if (value > 400) return 'quarter'
    if (value > 100) return 'month'
    if (value > 35) return 'week'
    return 'day'
  }
  const next = pick(days)
  if (!previous || next === previous) return next
  const order: Grain[] = ['day', 'week', 'month', 'quarter', 'year']
  const zoomingOut = order.indexOf(next) > order.indexOf(previous)
  if (zoomingOut && pick(days / 1.18) === previous) return previous
  if (!zoomingOut && pick(days * 1.18) === previous) return previous
  return next
}

function floorToGrain(t: number, grain: Grain) {
  const d = new Date(t)
  const y = d.getFullYear()
  const m = d.getMonth()
  if (grain === 'year') return new Date(y, 0, 1)
  if (grain === 'quarter') return new Date(y, Math.floor(m / 3) * 3, 1)
  if (grain === 'month') return new Date(y, m, 1)
  if (grain === 'week') {
    const day = new Date(y, m, d.getDate())
    const mondayOffset = (day.getDay() + 6) % 7
    day.setDate(day.getDate() - mondayOffset)
    return day
  }
  return new Date(y, m, d.getDate())
}

function addGrain(d: Date, grain: Grain) {
  const next = new Date(d)
  if (grain === 'year') next.setFullYear(next.getFullYear() + 1)
  else if (grain === 'quarter') next.setMonth(next.getMonth() + 3)
  else if (grain === 'month') next.setMonth(next.getMonth() + 1)
  else if (grain === 'week') next.setDate(next.getDate() + 7)
  else next.setDate(next.getDate() + 1)
  return next
}

function formatBucket(d: Date, grain: Grain, span: number) {
  const month = d.toLocaleString('en-US', { month: 'short' })
  const year = d.getFullYear()
  const shortYear = `'${String(year).slice(2)}`
  const multiYear = span > 370 * DAY
  if (grain === 'year') return String(year)
  if (grain === 'quarter') {
    const quarter = Math.floor(d.getMonth() / 3) + 1
    return `Q${quarter} ${year}`
  }
  if (grain === 'month') return `${month} ${year}`
  if (grain === 'week') return multiYear ? `${month} ${d.getDate()} ${shortYear}` : `${month} ${d.getDate()}`
  if (span <= 35 * DAY) return String(d.getDate()).padStart(2, '0')
  return `${month} ${d.getDate()}`
}

function lowerBound(points: LeadCapturePoint[], t: number) {
  let lo = 0
  let hi = points.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (points[mid].t < t) lo = mid + 1
    else hi = mid
  }
  return lo
}

function clampView(start: number, end: number, min: number, max: number): TimeView {
  const minSpan = 7 * DAY
  const dataSpan = Math.max(minSpan, max - min + DAY)
  const span = Math.min(dataSpan, Math.max(minSpan, end - start))
  let nextStart = start
  let nextEnd = nextStart + span
  if (nextStart < min) {
    nextStart = min
    nextEnd = nextStart + span
  }
  if (nextEnd > max + DAY) {
    nextEnd = max + DAY
    nextStart = nextEnd - span
  }
  if (nextStart < min) nextStart = min
  return { start: nextStart, end: Math.max(nextStart + minSpan, nextEnd) }
}

function colorForSource(source: string) {
  let hash = 0
  for (let i = 0; i < source.length; i++) hash = (hash * 31 + source.charCodeAt(i)) >>> 0
  return COLORS[hash % COLORS.length]
}

function labelForSource(key: string) {
  return shortLabelMap[key] || key.replace(/_+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  if (!active || !payload || !payload.length) return null

  const nonZero = payload.filter((p) => (p?.value ?? 0) > 0)
  if (!nonZero.length) return null

  const total = nonZero.reduce((sum, entry) => sum + (entry?.value ?? 0), 0)
  const heading = String((payload[0]?.payload as { date?: string } | undefined)?.date ?? label ?? '')

  return (
    <div className="bg-zinc-900 text-white rounded-lg shadow-xl px-3 py-2 text-xs min-w-[180px] border border-zinc-700">
      <div className="font-semibold text-[12px] mb-2">{heading}</div>
      <div className="space-y-1">
        {nonZero.slice(0, 8).map((entry, index) => {
          const key = String(entry.dataKey ?? entry.name ?? '')
          return (
            <div key={index} className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-[3px] h-3 rounded-sm inline-block shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-white/70 truncate">{labelForSource(key)}</span>
              </div>
              <span className="font-semibold text-white tabular-nums">{entry.value}</span>
            </div>
          )
        })}
        {nonZero.length > 8 && (
          <div className="text-[10px] text-white/50 pt-0.5">+{nonZero.length - 8} more</div>
        )}
      </div>
      <div className="border-t border-zinc-700 mt-2 pt-2 flex justify-between text-[11px]">
        <span className="text-white/60">Total</span>
        <span className="font-semibold text-white tabular-nums">{total}</span>
      </div>
    </div>
  )
}

export function LeadSourceAreaChart({
  data,
  points = [],
  initialStart,
  initialEnd,
  height = 280,
  title = 'Lead Captures Over Time',
  expanded = false,
  onToggleExpanded,
}: {
  data: AreaData[]
  points?: LeadCapturePoint[]
  /** yyyy-mm-dd window from the dashboard filter. Changing it recenters the chart. */
  initialStart?: string
  initialEnd?: string
  height?: number
  title?: string
  expanded?: boolean
  onToggleExpanded?: () => void
}) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<TimeView | null>(null)
  const targetRef = useRef<TimeView | null>(null)
  const pendingView = useRef<TimeView | null>(null)
  const frameRef = useRef(0)
  const springRef = useRef(0)
  const grainHold = useRef<Grain>('month')
  const dragRef = useRef<{ x: number; start: number; end: number; moved: boolean } | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [seriesMotion, setSeriesMotion] = useState(false)
  const [view, setView] = useState<TimeView | null>(null)
  const [dragging, setDragging] = useState(false)
  const motionTimer = useRef(0)

  if (!pendingView.current || pendingView.current === view) {
    viewRef.current = view
  }

  const stopSpring = useCallback(() => {
    if (springRef.current) cancelAnimationFrame(springRef.current)
    springRef.current = 0
  }, [])

  const followTarget = useCallback(() => {
    const target = targetRef.current
    const current = viewRef.current
    if (!target || !current) {
      springRef.current = 0
      return
    }
    const start = current.start + (target.start - current.start) * 0.32
    const end = current.end + (target.end - current.end) * 0.32
    const span = Math.max(DAY, target.end - target.start)
    const settled =
      Math.abs(target.start - start) < span * 0.0012 &&
      Math.abs(target.end - end) < span * 0.0012
    const next = settled ? target : { start, end }
    viewRef.current = next
    pendingView.current = next
    setView(next)
    springRef.current = settled ? 0 : requestAnimationFrame(followTarget)
  }, [])

  const setTarget = useCallback((next: TimeView) => {
    targetRef.current = next
    if (!viewRef.current) {
      viewRef.current = next
      setView(next)
      return
    }
    if (!springRef.current) springRef.current = requestAnimationFrame(followTarget)
  }, [followTarget])

  const applyImmediate = useCallback((next: TimeView) => {
    stopSpring()
    targetRef.current = next
    viewRef.current = next
    pendingView.current = next
    if (frameRef.current) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0
      if (pendingView.current) setView({ ...pendingView.current })
    })
  }, [stopSpring])

  useEffect(() => () => {
    cancelAnimationFrame(frameRef.current)
    cancelAnimationFrame(springRef.current)
    window.clearTimeout(motionTimer.current)
  }, [])

  const bounds = useMemo(() => {
    if (!points.length) return null
    return { min: points[0].t, max: points[points.length - 1].t }
  }, [points])

  useEffect(() => {
    if (!initialStart || !initialEnd || !bounds) return
    const start = parseLocalDate(initialStart)
    const end = parseLocalDate(initialEnd)
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return
    const next = clampView(start, end, bounds.min, bounds.max)
    targetRef.current = next
    viewRef.current = next
    setView(next)
  }, [initialStart, initialEnd, bounds])

  useEffect(() => {
    const el = surfaceRef.current
    if (!el) return

    const onWheel = (event: WheelEvent) => {
      if (!bounds || !viewRef.current) return
      event.preventDefault()

      const rect = el.getBoundingClientRect()
      const plotLeft = 36
      const plotWidth = Math.max(1, rect.width - plotLeft - 12)
      const current = targetRef.current ?? viewRef.current
      const span = current.end - current.start

      if (!event.ctrlKey && Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        const shift = (event.deltaX / plotWidth) * span
        const next = clampView(current.start + shift, current.end + shift, bounds.min, bounds.max)
        setTarget(next)
        return
      }

      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
      const zoomOut = Math.exp(delta * 0.0016)
      const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left - plotLeft) / plotWidth))
      const anchor = current.start + ratio * span
      const nextSpan = span * zoomOut
      const next = clampView(
        anchor - ratio * nextSpan,
        anchor + (1 - ratio) * nextSpan,
        bounds.min,
        bounds.max,
      )
      setTarget(next)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [bounds, setTarget])

  const aggregated = useMemo(() => {
    if (!view || !points.length) return null
    const grain = grainForSpan(view.end - view.start, grainHold.current)
    grainHold.current = grain
    const rows: AreaData[] = []
    const sourceSet = new Set<string>()
    let cursor = floorToGrain(view.start, grain)
    const end = view.end
    let guard = 0

    while (cursor.getTime() < end && guard < 120) {
      const next = addGrain(cursor, grain)
      const from = Math.max(cursor.getTime(), view.start)
      const to = Math.min(next.getTime(), end)
      const row: AreaData = {
        date: formatBucket(cursor, grain, view.end - view.start),
        t: cursor.getTime(),
      }
      const startIndex = lowerBound(points, from)
      for (let i = startIndex; i < points.length; i++) {
        const point = points[i]
        if (point.t >= to) break
        sourceSet.add(point.source)
        row[point.source] = (Number(row[point.source]) || 0) + 1
      }
      rows.push(row)
      cursor = next
      guard += 1
    }

    const sources = Array.from(sourceSet).sort((a, b) => a.localeCompare(b))
    for (const row of rows) {
      for (const source of sources) {
        if (row[source] == null) row[source] = 0
      }
    }

    return { rows, sources, grain }
  }, [view, points])

  const fallbackSources = useMemo(
    () =>
      Array.from(new Set(data.flatMap((row) => Object.keys(row).filter((key) => key !== 'date')))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [data],
  )

  const usingTimeline = Boolean(aggregated)
  const chartRows = aggregated?.rows ?? data
  const leadSources = aggregated?.sources ?? fallbackSources
  const grain = aggregated?.grain ?? null
  const visibleSources = leadSources.filter((source) => !hidden.has(source))
  const displayRows = useMemo(() => {
    if (!hidden.size) return chartRows
    return chartRows.map((row) => {
      const next: AreaData = { ...row }
      for (const source of hidden) next[source] = 0
      return next
    })
  }, [chartRows, hidden])

  const stackMax = (rows: AreaData[]) => {
    let max = 0
    for (const row of rows) {
      let sum = 0
      for (const source of leadSources) sum += Number(row[source]) || 0
      if (sum > max) max = sum
    }
    return Math.max(1, Math.ceil(max * 1.1))
  }

  const visibleMax = stackMax(displayRows)
  const restingMax = useRef(visibleMax)
  if (!seriesMotion) restingMax.current = visibleMax
  const axisMax = seriesMotion ? Math.max(restingMax.current, visibleMax) : visibleMax

  const totalCaptures = chartRows.reduce((sum, row) => {
    return sum + visibleSources.reduce((rowSum, source) => rowSum + (Number(row[source]) || 0), 0)
  }, 0)

  const stepZoom = (direction: 'in' | 'out') => {
    if (!bounds || !view) return
    const base = targetRef.current ?? view
    const span = base.end - base.start
    const factor = direction === 'in' ? 0.72 : 1.4
    const mid = base.start + span / 2
    const nextSpan = span * factor
    setTarget(clampView(mid - nextSpan / 2, mid + nextSpan / 2, bounds.min, bounds.max))
  }

  const resetView = () => {
    if (!bounds || !initialStart || !initialEnd) return
    const start = parseLocalDate(initialStart)
    const end = parseLocalDate(initialEnd)
    if (end > start) setTarget(clampView(start, end, bounds.min, bounds.max))
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!viewRef.current || event.button !== 0) return
    stopSpring()
    targetRef.current = viewRef.current
    dragRef.current = {
      x: event.clientX,
      start: viewRef.current.start,
      end: viewRef.current.end,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || !bounds) return
    const dx = event.clientX - drag.x
    if (Math.abs(dx) > 3) drag.moved = true
    const width = Math.max(1, (surfaceRef.current?.clientWidth ?? 1) - 48)
    const span = drag.end - drag.start
    const shift = (-dx / width) * span
    applyImmediate(clampView(drag.start + shift, drag.end + shift, bounds.min, bounds.max))
  }

  const onPointerUp = () => {
    dragRef.current = null
    setDragging(false)
  }

  const toggleSource = (source: string) => {
    setSeriesMotion(true)
    window.clearTimeout(motionTimer.current)
    motionTimer.current = window.setTimeout(() => setSeriesMotion(false), 650)
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(source)) next.delete(source)
      else next.add(source)
      return next
    })
  }

  return (
    <div className="w-full min-w-0 overflow-hidden bg-card border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-4 flex flex-col">
      <div className="flex items-baseline justify-between mb-3 gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          <p className="text-[11px] text-muted-foreground">
            Scroll or pinch to zoom from year to day. Drag to move.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {grain && (
            <div className="flex items-center rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <button
                type="button"
                onClick={() => stepZoom('out')}
                className="px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Zoom out"
              >
                −
              </button>
              <span className="px-2 text-[10px] font-medium tabular-nums text-muted-foreground border-x border-zinc-200 dark:border-zinc-800">
                {GRAIN_LABEL[grain]}
              </span>
              <button
                type="button"
                onClick={() => stepZoom('in')}
                className="px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Zoom in"
              >
                +
              </button>
            </div>
          )}
          <div className="text-right">
            <div className="text-xl font-bold leading-none tabular-nums">{totalCaptures.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Captures</div>
          </div>
          {onToggleExpanded && (
            <button
              type="button"
              onClick={onToggleExpanded}
              aria-pressed={expanded}
              aria-label={expanded ? 'Shrink chart' : 'Expand chart'}
              title={expanded ? 'Shrink chart' : 'Expand chart'}
              className="rounded-md border border-zinc-200 p-1.5 text-muted-foreground hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
            >
              {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </button>
          )}
        </div>
      </div>

      <div
        ref={surfaceRef}
        className={`relative w-full ${dragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
        style={{ height, touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={resetView}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayRows} margin={{ top: 16, right: 12, left: 0, bottom: 4 }}>
            <defs>
              {leadSources.map((key) => (
                <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colorForSource(key)} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={colorForSource(key)} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              horizontal
              vertical={false}
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-zinc-200 dark:text-zinc-800"
            />
            {view && aggregated ? (
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={[view.start, view.end]}
                allowDataOverflow
                axisLine={false}
                tickLine={false}
                minTickGap={aggregated.grain === 'month' || aggregated.grain === 'quarter' ? 64 : 36}
                tickFormatter={(value) =>
                  formatBucket(new Date(Number(value)), aggregated.grain, view.end - view.start)
                }
                tick={{ fontSize: 10, fill: 'currentColor' }}
                className="text-zinc-500 dark:text-zinc-400"
              />
            ) : (
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                minTickGap={28}
                tick={{ fontSize: 10, fill: 'currentColor' }}
                className="text-zinc-500 dark:text-zinc-400"
              />
            )}
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              width={36}
              domain={[0, axisMax]}
              tick={{ fontSize: 10, fill: 'currentColor' }}
              className="text-zinc-500 dark:text-zinc-400"
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#9ca3af', strokeDasharray: '3 3', strokeWidth: 1 }}
            />
            {leadSources.map((key) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="1"
                stroke={colorForSource(key)}
                strokeWidth={1.5}
                fill={`url(#gradient-${key})`}
                connectNulls
                isAnimationActive={seriesMotion}
                animationDuration={seriesMotion ? 550 : 0}
                animationEasing="ease-in-out"
                activeDot={
                  hidden.has(key)
                    ? false
                    : { r: 3.5, fill: '#fff', stroke: colorForSource(key), strokeWidth: 2 }
                }
                name={key}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-wrap gap-x-1 gap-y-1 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
        {leadSources.map((source) => {
          const isHidden = hidden.has(source)
          return (
            <li key={source}>
              <button
                type="button"
                aria-pressed={!isHidden}
                title={isHidden ? `Show ${labelForSource(source)}` : `Hide ${labelForSource(source)}`}
                onClick={() => toggleSource(source)}
                className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-opacity duration-500 ease-in-out hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  isHidden ? 'opacity-35' : 'opacity-100'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-[2px] inline-block shrink-0"
                  style={{ backgroundColor: isHidden ? 'transparent' : colorForSource(source), boxShadow: `inset 0 0 0 1.5px ${colorForSource(source)}` }}
                />
                <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                  {labelForSource(source)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {!usingTimeline && (
        <p className="mt-1 text-[10px] text-muted-foreground">Loading timeline…</p>
      )}
    </div>
  )
}
