'use client'

import { Radius } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface ServiceChartProps {
  data: {
    service_product: string
    count: number
  }[]
}

export function ServiceBarChart({ data }: ServiceChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="0 1" />
          <XAxis dataKey="service_product" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar radius={5} dataKey="count" fill="#FF5722" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
