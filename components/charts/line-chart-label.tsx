'use client'

import { useTheme } from 'next-themes'
import { TrendingUp, TrendingDown } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipProps,
} from 'recharts'
import { ZoomPanChart } from './zoom-pan-chart'

type OverallLeadsData = {
  label: string
  totalLeads: number
}

type OverallLeadsLineChartProps = {
  data: OverallLeadsData[]
  selectedYear: number
  selectedMonth: string
  selectedInterval: string
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-zinc-900 text-white rounded-lg shadow-xl px-3 py-2 text-xs min-w-[150px] border border-zinc-700">
      <div className="font-semibold text-[12px] mb-2">{label}</div>
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <span
            className="w-[3px] h-3 rounded-sm inline-block"
            style={{ backgroundColor: payload[0]?.color || '#fff' }}
          />
          <span className="text-white/70">Total Leads</span>
        </div>
        <span className="font-semibold text-white tabular-nums">
          {payload[0]?.value}
        </span>
      </div>
    </div>
  )
}

export function OverallLeadsLineChart({
  data,
  selectedYear,
  selectedMonth,
  selectedInterval,
}: OverallLeadsLineChartProps) {
  const { theme } = useTheme()

  const lineColor = theme === 'dark' ? '#60a5fa' : '#2563eb'
  const dotFill = theme === 'dark' ? '#0f172a' : '#ffffff'

  const getTrend = () => {
    if (data.length < 2) return { direction: 'neutral' as const, percentage: 0 }

    const lastValue = data[data.length - 1]?.totalLeads || 0
    const previousValue = data[data.length - 2]?.totalLeads || 0

    if (previousValue === 0)
      return { direction: 'neutral' as const, percentage: 0 }

    const change = ((lastValue - previousValue) / previousValue) * 100
    return {
      direction: (change >= 0 ? 'up' : 'down') as 'up' | 'down',
      percentage: Math.abs(change).toFixed(1),
    }
  }

  const trend = getTrend()
  const totalCount = data.reduce((sum, item) => sum + item.totalLeads, 0)

  const getDescription = () => {
    if (selectedInterval === 'annually') return `Annual overview of leads`
    if (selectedInterval === 'quarterly')
      return `Quarterly breakdown for ${selectedYear}`
    if (selectedInterval === 'weekly')
      return `Weekly breakdown for ${selectedYear}`
    if (selectedMonth === 'all') return `Monthly breakdown for ${selectedYear}`
    return `Daily breakdown for ${selectedMonth} ${selectedYear}`
  }

  return (
    <div className="w-full bg-card border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-4 flex flex-col">
      <div className="flex items-baseline justify-between mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">
            Overall Leads Trend
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {getDescription()}
          </p>
        </div>
        <div className="text-right shrink-0 ml-3">
          <div className="text-xl font-bold leading-none tabular-nums">
            {totalCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-end gap-1">
            {trend.direction === 'up' ? (
              <>
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-500 font-medium">
                  {trend.percentage}%
                </span>
              </>
            ) : trend.direction === 'down' ? (
              <>
                <TrendingDown className="h-3 w-3 text-red-500" />
                <span className="text-red-500 font-medium">
                  {trend.percentage}%
                </span>
              </>
            ) : (
              <span>No change</span>
            )}
          </div>
        </div>
      </div>

      <ZoomPanChart
        dataLength={data.length}
        basePxPerPoint={56}
        height={280}
        className="w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 16, right: 16, left: 0, bottom: 10 }}
          >
            <CartesianGrid
              horizontal
              vertical={false}
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-zinc-200 dark:text-zinc-800"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={{ fontSize: 10, fill: 'currentColor' }}
              className="text-zinc-500 dark:text-zinc-400"
              angle={
                selectedMonth !== 'all' && selectedInterval === 'monthly'
                  ? -45
                  : 0
              }
              textAnchor={
                selectedMonth !== 'all' && selectedInterval === 'monthly'
                  ? 'end'
                  : 'middle'
              }
              height={
                selectedMonth !== 'all' && selectedInterval === 'monthly'
                  ? 50
                  : 24
              }
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              width={32}
              tick={{ fontSize: 10, fill: 'currentColor' }}
              className="text-zinc-500 dark:text-zinc-400"
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: '#9ca3af',
                strokeDasharray: '3 3',
                strokeWidth: 1,
              }}
            />
            <Line
              type="monotone"
              dataKey="totalLeads"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                fill: dotFill,
                stroke: lineColor,
                strokeWidth: 2,
              }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </ZoomPanChart>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-[11px]">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {trend.direction === 'up' ? (
            <>
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="font-medium text-emerald-500">
                Up {trend.percentage}%
              </span>
            </>
          ) : trend.direction === 'down' ? (
            <>
              <TrendingDown className="h-3 w-3 text-red-500" />
              <span className="font-medium text-red-500">
                Down {trend.percentage}%
              </span>
            </>
          ) : (
            <span>No change</span>
          )}
          <span>from previous period</span>
        </div>
      </div>
    </div>
  )
}
