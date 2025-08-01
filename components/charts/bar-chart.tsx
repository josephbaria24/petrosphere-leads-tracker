'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  TooltipProps,
} from 'recharts'

interface ServiceChartProps {
  data: {
    service_product: string
    count: number
  }[]
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="bg-black text-white rounded-md shadow-md px-3 py-2 text-sm">
      <div className="font-semibold mb-1">{label}</div>
      {payload.map((entry, index) => (
        <div key={index} className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.name}</span>
          </div>
          <span className="font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

// Stable hash function to generate consistent color from string
const stringToColor = (str: string): string => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const color = (hash & 0x00ffffff).toString(16).toUpperCase()
  return '#' + '00000'.substring(0, 6 - color.length) + color
}

export function ServiceBarChart({ data }: ServiceChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="0 1" />
          <XAxis
            dataKey="service_product"
            interval={0}
            angle={-45}
            textAnchor="end"
            tick={{ fontSize: 10 }}
            height={80}
          />
          <YAxis allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} cursor={false} />

          <Bar radius={5} dataKey="count">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={stringToColor(entry.service_product)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
