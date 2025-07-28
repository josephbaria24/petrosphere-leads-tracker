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
} from 'recharts'

interface ServiceChartProps {
  data: {
    service_product: string
    count: number
  }[]
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
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
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
          <Tooltip />
          <Bar radius={5} dataKey="count">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={stringToColor(entry.service_product)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
