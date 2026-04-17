'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  TooltipProps,
} from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { ZoomPanChart } from './zoom-pan-chart'

export interface ClosedWonTrend {
  month: string
  closed_amount: number
  potential_amount?: number
  won_count?: number
  opportunity_count?: number
  /** @deprecated use won_count */
  won_opportunities?: number
}

type EnrichedTrend = ClosedWonTrend & {
  prevClosed: number | null
  prevPotential: number | null
}

const PESO = '\u20B1'

const formatPesoFull = (v: number) =>
  `${PESO}${v.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`

const formatPesoCompact = (v: number) => {
  if (!isFinite(v)) return `${PESO}0`
  if (v >= 1_000_000_000)
    return `${PESO}${(v / 1_000_000_000).toFixed(v >= 10_000_000_000 ? 0 : 1)}B`
  if (v >= 1_000_000)
    return `${PESO}${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`
  if (v >= 1_000)
    return `${PESO}${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}K`
  return `${PESO}${v.toFixed(0)}`
}

const formatAxisTick = (v: number) => {
  if (!isFinite(v)) return '0'
  if (v >= 1_000_000_000)
    return `${(v / 1_000_000_000).toFixed(v >= 10_000_000_000 ? 0 : 1)}B`
  if (v >= 1_000_000)
    return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}K`
  return `${v}`
}

const SERIES = {
  closed: { name: 'Closed Won', color: '#2563eb', gradId: 'closedWonFill' },
  potential: { name: 'Potential', color: '#14b8a6', gradId: 'potentialFill' },
} as const

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  if (!active || !payload || payload.length === 0) return null

  const raw = (payload[0]?.payload ?? {}) as Partial<EnrichedTrend>
  const closed = Number(raw.closed_amount ?? 0)
  const potential = Number(raw.potential_amount ?? 0)
  const prevClosed = raw.prevClosed
  const wonCount = raw.won_count ?? 0
  const oppCount = raw.opportunity_count ?? 0

  const change =
    typeof prevClosed === 'number' && prevClosed > 0
      ? ((closed - prevClosed) / prevClosed) * 100
      : null

  return (
    <div className="bg-zinc-900 text-white rounded-lg shadow-xl px-3 py-2.5 text-xs border border-zinc-700 min-w-[200px]">
      <div className="text-[10px] text-white/60 mb-0.5">{label}</div>
      <div className="text-base font-bold tabular-nums flex items-center gap-2">
        <span>{formatPesoFull(closed)}</span>
        {change !== null && (
          <span
            className={`text-[11px] font-medium flex items-center gap-0.5 ${
              change >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {change >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {change >= 0 ? '+' : ''}
            {change.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="mt-2 space-y-1">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-[3px] h-3 rounded-sm inline-block shrink-0"
              style={{ backgroundColor: SERIES.closed.color }}
            />
            <span className="text-white/70">Closed Won</span>
          </div>
          <span className="font-semibold tabular-nums">
            {formatPesoCompact(closed)}
          </span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-[3px] h-3 rounded-sm inline-block shrink-0"
              style={{ backgroundColor: SERIES.potential.color }}
            />
            <span className="text-white/70">Potential</span>
          </div>
          <span className="font-semibold tabular-nums">
            {formatPesoCompact(potential)}
          </span>
        </div>
      </div>

      <div className="border-t border-zinc-700 mt-2 pt-2 flex justify-between text-[10px] text-white/60">
        <span>{wonCount.toLocaleString()} won</span>
        <span>{oppCount.toLocaleString()} opportunities</span>
      </div>
    </div>
  )
}

export default function ClosedWonTrendsChart({
  data,
}: {
  data: ClosedWonTrend[]
}) {
  const enriched = useMemo<EnrichedTrend[]>(
    () =>
      data.map((d, i) => ({
        ...d,
        closed_amount: Number(d.closed_amount) || 0,
        potential_amount: Number(d.potential_amount) || 0,
        won_count: Number(d.won_count ?? d.won_opportunities ?? 0),
        opportunity_count: Number(d.opportunity_count ?? 0),
        prevClosed: i > 0 ? Number(data[i - 1].closed_amount) || 0 : null,
        prevPotential:
          i > 0 ? Number(data[i - 1].potential_amount) || 0 : null,
      })),
    [data],
  )

  const totalClosed = useMemo(
    () => enriched.reduce((s, d) => s + d.closed_amount, 0),
    [enriched],
  )
  const totalPotential = useMemo(
    () => enriched.reduce((s, d) => s + (d.potential_amount || 0), 0),
    [enriched],
  )
  const totalWonCount = useMemo(
    () => enriched.reduce((s, d) => s + (d.won_count || 0), 0),
    [enriched],
  )

  const trend = useMemo(() => {
    if (enriched.length < 2) return { dir: 'neutral' as const, pct: 0 }
    const last = enriched[enriched.length - 1].closed_amount
    const prev = enriched[enriched.length - 2].closed_amount
    if (prev === 0) return { dir: 'neutral' as const, pct: 0 }
    const change = ((last - prev) / prev) * 100
    return {
      dir: (change >= 0 ? 'up' : 'down') as 'up' | 'down',
      pct: Math.abs(change),
    }
  }, [enriched])

  return (
    <div className="w-full bg-card border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-4 flex flex-col">
      <div className="flex items-baseline justify-between mb-3 gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">
            Closed Won Trends
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Actual revenue vs. pipeline potential
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-bold leading-none tabular-nums">
            {formatPesoCompact(totalClosed)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-end gap-1 flex-wrap">
            {trend.dir === 'up' ? (
              <>
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-500 font-medium">
                  {trend.pct.toFixed(1)}%
                </span>
              </>
            ) : trend.dir === 'down' ? (
              <>
                <TrendingDown className="h-3 w-3 text-red-500" />
                <span className="text-red-500 font-medium">
                  {trend.pct.toFixed(1)}%
                </span>
              </>
            ) : (
              <span>No change</span>
            )}
            <span className="text-muted-foreground/70">
              • {totalWonCount.toLocaleString()} wins
            </span>
          </div>
        </div>
      </div>

      <ZoomPanChart
        dataLength={enriched.length}
        basePxPerPoint={60}
        height={260}
        className="w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={enriched}
            margin={{ top: 16, right: 16, left: 0, bottom: 10 }}
          >
            <defs>
              <linearGradient
                id={SERIES.closed.gradId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={SERIES.closed.color}
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor={SERIES.closed.color}
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient
                id={SERIES.potential.gradId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={SERIES.potential.color}
                  stopOpacity={0.25}
                />
                <stop
                  offset="100%"
                  stopColor={SERIES.potential.color}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              horizontal
              vertical={false}
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-zinc-200 dark:text-zinc-800"
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={{ fontSize: 10, fill: 'currentColor' }}
              className="text-zinc-500 dark:text-zinc-400"
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={formatAxisTick}
              tick={{ fontSize: 10, fill: 'currentColor' }}
              className="text-zinc-500 dark:text-zinc-400"
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: '#60a5fa',
                strokeDasharray: '3 3',
                strokeWidth: 1,
              }}
            />

            <Area
              type="monotone"
              dataKey="potential_amount"
              stroke={SERIES.potential.color}
              strokeWidth={1.75}
              strokeDasharray="4 3"
              fill={`url(#${SERIES.potential.gradId})`}
              dot={false}
              activeDot={{
                r: 4,
                fill: SERIES.potential.color,
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
              name={SERIES.potential.name}
            />
            <Area
              type="monotone"
              dataKey="closed_amount"
              stroke={SERIES.closed.color}
              strokeWidth={2}
              fill={`url(#${SERIES.closed.gradId})`}
              dot={false}
              activeDot={{
                r: 5,
                fill: SERIES.closed.color,
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
              name={SERIES.closed.name}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ZoomPanChart>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-[2px] inline-block"
            style={{ backgroundColor: SERIES.closed.color }}
          />
          <span className="text-muted-foreground">Closed Won</span>
          <span className="font-semibold tabular-nums">
            {formatPesoCompact(totalClosed)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-[2px] inline-block"
            style={{ backgroundColor: SERIES.potential.color }}
          />
          <span className="text-muted-foreground">Potential</span>
          <span className="font-semibold tabular-nums">
            {formatPesoCompact(totalPotential)}
          </span>
        </div>
      </div>
    </div>
  )
}
