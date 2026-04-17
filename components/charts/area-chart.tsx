'use client'

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
import { ZoomPanChart } from './zoom-pan-chart'

const shortLabelMap: Record<string, string> = {
  email: 'Email',
  inbound___email: 'I-Email',
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

type AreaData = {
  date: string
  [leadSource: string]: string | number
}

const StaticLegend = ({
  items,
}: {
  items: { name: string; color: string }[]
}) => (
  <ul className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
    {items.map((entry, index) => (
      <li key={`legend-${index}`} className="flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-[2px] inline-block"
          style={{ backgroundColor: entry.color }}
        />
        <span
          className="text-[10px] text-muted-foreground truncate max-w-[90px]"
          title={entry.name}
        >
          {shortLabelMap[entry.name] || entry.name}
        </span>
      </li>
    ))}
  </ul>
)

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  if (!active || !payload || !payload.length) return null

  const nonZero = payload.filter((p) => (p?.value ?? 0) > 0)
  if (!nonZero.length) return null

  const total = nonZero.reduce((sum, entry) => sum + (entry?.value ?? 0), 0)

  return (
    <div className="bg-zinc-900 text-white rounded-lg shadow-xl px-3 py-2 text-xs min-w-[180px] border border-zinc-700">
      <div className="font-semibold text-[12px] mb-2">{label}</div>
      <div className="space-y-1">
        {nonZero.slice(0, 8).map((entry, index) => (
          <div
            key={index}
            className="flex justify-between items-center gap-4"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-[3px] h-3 rounded-sm inline-block shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-white/70 truncate">
                {shortLabelMap[entry.name as string] || entry.name}
              </span>
            </div>
            <span className="font-semibold text-white tabular-nums">
              {entry.value}
            </span>
          </div>
        ))}
        {nonZero.length > 8 && (
          <div className="text-[10px] text-white/50 pt-0.5">
            +{nonZero.length - 8} more
          </div>
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
  height = 280,
  pxPerPoint = 56,
  title = 'Lead Captures Over Time',
  subtitle = 'Drag horizontally to view all data points',
}: {
  data: AreaData[]
  height?: number
  pxPerPoint?: number
  title?: string
  subtitle?: string
}) {
  const colors = [
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

  const leadSources = Array.from(
    new Set(data.flatMap((row) => Object.keys(row).filter((k) => k !== 'date'))),
  ).sort((a, b) => a.localeCompare(b))

  const totalCaptures = data.reduce((sum, row) => {
    const rowSum = leadSources.reduce(
      (s, k) => s + (Number(row[k]) || 0),
      0,
    )
    return sum + rowSum
  }, 0)

  const legendItems = leadSources.map((name, i) => ({
    name,
    color: colors[i % colors.length],
  }))

  return (
    <div className="w-full bg-card border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-4 flex flex-col">
      <div className="flex items-baseline justify-between mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-right shrink-0 ml-3">
          <div className="text-xl font-bold leading-none tabular-nums">
            {totalCaptures.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Captures
          </div>
        </div>
      </div>

      <ZoomPanChart
        dataLength={data.length}
        basePxPerPoint={pxPerPoint}
        height={height}
        className="w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 16, left: 0, bottom: 10 }}
          >
            <defs>
              {leadSources.map((key, index) => (
                <linearGradient
                  key={key}
                  id={`gradient-${key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={colors[index % colors.length]}
                    stopOpacity={0.45}
                  />
                  <stop
                    offset="95%"
                    stopColor={colors[index % colors.length]}
                    stopOpacity={0.05}
                  />
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
            <XAxis
              dataKey="date"
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

            {leadSources.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="1"
                stroke={colors[index % colors.length]}
                strokeWidth={1.5}
                fill={`url(#gradient-${key})`}
                activeDot={{
                  r: 3.5,
                  fill: '#fff',
                  stroke: colors[index % colors.length],
                  strokeWidth: 2,
                }}
                name={
                  shortLabelMap[key] ||
                  key.charAt(0).toUpperCase() + key.slice(1)
                }
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </ZoomPanChart>

      <StaticLegend items={legendItems} />
    </div>
  )
}
