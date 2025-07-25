'use client'

import {
  LineChart as RechartLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface ChartProps {
  data: {
    lead_source: string
    count: number
  }[]
}

export function LineChart({ data }: ChartProps) {
  const colors = ['#FF5722']

  // ✅ Get top 3 lead sources by count
  const top3Data = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartLineChart data={top3Data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="0 1" />
          <XAxis dataKey="lead_source" />
          <YAxis allowDecimals={false} fontSize={14}/>
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="count"
            stroke={colors[0]}
            strokeWidth={2}
            dot={true}
          />
        </RechartLineChart>
      </ResponsiveContainer>
    </div>
  )
}
