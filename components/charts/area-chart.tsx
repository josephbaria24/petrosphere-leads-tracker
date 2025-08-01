import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  TooltipProps,
} from 'recharts'
import { LegendProps } from 'recharts'
import type { Payload } from 'recharts/types/component/DefaultLegendContent'

type AreaData = {
  date: string
  [leadSource: string]: string | number
}

const CustomLegend = ({ payload }: LegendProps) => (
  <ul className="flex flex-wrap gap-4 mt-2 text-sm">
    {(payload as Payload[]).map((entry, index) => (
      <li key={`item-${index}`} className="flex items-center gap-1">
        <span
          className="inline-block w-3 h-3 rounded-full"
          style={{ backgroundColor: entry.color }}
        />
        <span>
          {(entry.value as string).charAt(0).toUpperCase() +
            (entry.value as string).slice(1)}
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

  const total = payload.reduce((sum, entry) => sum + (entry?.value ?? 0), 0)

  return (
    <div className="bg-black text-white rounded-md shadow-md px-3 py-2 text-sm w-[180px]">
      <div className="font-semibold mb-2">{label}</div>
      {payload.map((entry, index) => (
        <div key={index} className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: entry.color }}
            />
            <span className="capitalize">{entry.name}</span>
          </div>
          <span className="font-mono">{entry.value}</span>
        </div>
      ))}
      <div className="border-t mt-2 pt-2 flex justify-between text-xs font-medium text-muted-foreground">
        <span>Total</span>
        <span className="font-mono text-white">{total}</span>
      </div>
    </div>
  )
}

export function LeadSourceAreaChart({ data }: { data: AreaData[] }) {
  const colors = [
    '#d6a800', '#42a5f5', '#d6000e', '#66bb6a', '#ab47bc',
    '#fc0303', '#ffa726', '#8d6e63', '#f200ff', '#590000', '#008a37',
  ]

  const leadSources = Array.from(
    new Set(data.flatMap(row => Object.keys(row).filter(k => k !== 'date')))
  ).sort((a, b) => a.localeCompare(b))

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <defs>
            {leadSources.map((key, index) => (
              <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.8} />
                <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0.1} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid horizontal vertical={false} stroke="#ccc" strokeOpacity={0.1} />
          <XAxis dataKey="date" stroke="#94a3b8" />
          <YAxis allowDecimals={false} stroke="#94a3b8" />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Legend content={<CustomLegend />} />

          {leadSources.map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stackId="1"
              stroke={colors[index % colors.length]}
              fill={`url(#gradient-${key})`}
              name={key.charAt(0).toUpperCase() + key.slice(1)}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
